using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Appointments;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Customers;
using BarberBooking.Entities.Identity;
using BarberBooking.Entities.Notifications;
using BarberBooking.Entities.Scheduling;
using BarberBooking.Entities.Services;
using BarberBooking.Shared.DTOs.Appointments;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;
using BusinessEntity = BarberBooking.Entities.Businesses.Business;

namespace BarberBooking.Business.Services
{
    public class AppointmentManager : IAppointmentService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;
        private readonly INotificationService _notificationService;

        public AppointmentManager(
            IUnitOfWork unitOfWork,
            ICurrentTenantService tenantService,
            INotificationService notificationService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
            _notificationService = notificationService;
        }

        public async Task<IDataResult<IReadOnlyList<AvailableSlotResponseDto>>> GetAvailableSlotsAsync(AvailableSlotsQueryDto query, CancellationToken cancellationToken = default)
        {
            var branch = await _unitOfWork.Repository<Branch>().FirstOrDefaultAsync(b => b.Id == query.BranchId, cancellationToken);
            if (branch == null || !branch.IsActive)
            {
                return DataResult<IReadOnlyList<AvailableSlotResponseDto>>.Fail("Şube bulunamadı veya hizmete kapalı.", 404);
            }

            TimeZoneInfo tz;
            try
            {
                tz = TimeZoneInfo.FindSystemTimeZoneById(branch.TimeZoneId ?? "Europe/Istanbul");
            }
            catch
            {
                tz = TimeZoneInfo.Utc;
            }

            // Hizmet ve Süre Bilgisi (Şube Override öncelikli)
            var branchService = await _unitOfWork.Repository<BranchService>().QueryAsNoTracking()
                .Include(bs => bs.Service)
                .FirstOrDefaultAsync(bs => bs.BranchId == query.BranchId && bs.ServiceId == query.ServiceId && bs.IsActive, cancellationToken);

            if (branchService == null || !branchService.Service.IsActive)
            {
                return DataResult<IReadOnlyList<AvailableSlotResponseDto>>.Fail("Hizmet bu şubede aktif değil.", 404);
            }

            var staffProvidesService = await _unitOfWork.Repository<StaffService>().AnyAsync(
                ss => ss.StaffProfileId == query.StaffProfileId && ss.BranchId == query.BranchId && ss.ServiceId == query.ServiceId,
                cancellationToken);

            if (!staffProvidesService)
            {
                return DataResult<IReadOnlyList<AvailableSlotResponseDto>>.Ok(
                    new List<AvailableSlotResponseDto>(),
                    "Seçilen personel bu hizmeti vermemektedir.");
            }

            int durationMinutes = branchService.DurationOverride ?? branchService.Service.DurationMinutes;
            if (durationMinutes <= 0) durationMinutes = 30;

            var dayOfWeek = query.Date.DayOfWeek;

            // 1. Personel o gün çalışıyor mu?
            var staffWorkingHour = await _unitOfWork.Repository<StaffWorkingHour>().QueryAsNoTracking()
                .Include(swh => swh.Breaks)
                .FirstOrDefaultAsync(swh => swh.StaffProfileId == query.StaffProfileId && swh.BranchId == query.BranchId && swh.DayOfWeek == dayOfWeek, cancellationToken);

            if (staffWorkingHour == null)
            {
                return DataResult<IReadOnlyList<AvailableSlotResponseDto>>.Ok(new List<AvailableSlotResponseDto>(), "Personel bu gün çalışmamaktadır.");
            }

            // Günlük başlangıç ve bitiş UTC pencereleri
            var localDayStart = query.Date.ToDateTime(staffWorkingHour.StartTime);
            var localDayEnd = query.Date.ToDateTime(staffWorkingHour.EndTime);

            var dayStartUtc = new DateTimeOffset(localDayStart, tz.GetUtcOffset(localDayStart)).ToUniversalTime();
            var dayEndUtc = new DateTimeOffset(localDayEnd, tz.GetUtcOffset(localDayEnd)).ToUniversalTime();

            // 2. Şube veya Personel Tatil/İzin İstisnası Var mı?
            var branchClosed = await _unitOfWork.Repository<BranchScheduleException>().AnyAsync(
                e => e.BranchId == query.BranchId && e.Type == BranchScheduleExceptionType.Closed && e.StartAt < dayEndUtc && e.EndAt > dayStartUtc,
                cancellationToken);

            if (branchClosed)
            {
                return DataResult<IReadOnlyList<AvailableSlotResponseDto>>.Ok(new List<AvailableSlotResponseDto>(), "Şube seçilen tarihte kapalıdır.");
            }

            var staffExceptions = await _unitOfWork.Repository<StaffScheduleException>().QueryAsNoTracking()
                .Where(e => e.StaffProfileId == query.StaffProfileId &&
                            e.BranchId == query.BranchId &&
                            e.StartAt < dayEndUtc &&
                            e.EndAt > dayStartUtc)
                .Select(e => new { e.StartAt, e.EndAt })
                .ToListAsync(cancellationToken);

            // 3. Mevcut Randevular (aynı personelin tüm şubelerindeki çakışan randevuları dahil)
            var activeAppointments = await _unitOfWork.Repository<Appointment>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(a => a.StaffProfileId == query.StaffProfileId &&
                            a.StartAt < dayEndUtc &&
                            a.EndAt > dayStartUtc &&
                            (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed))
                .Select(a => new { a.StartAt, a.EndAt })
                .ToListAsync(cancellationToken);

            // 4. Mola Aralıklarını UTC'ye Dönüştürme
            var breakIntervals = staffWorkingHour.Breaks.Select(b =>
            {
                var dtStart = query.Date.ToDateTime(b.StartTime);
                var dtEnd = query.Date.ToDateTime(b.EndTime);
                return new
                {
                    StartUtc = new DateTimeOffset(dtStart, tz.GetUtcOffset(dtStart)).ToUniversalTime(),
                    EndUtc = new DateTimeOffset(dtEnd, tz.GetUtcOffset(dtEnd)).ToUniversalTime()
                };
            }).ToList();

            // 5. Slot Üretimi (Adım aralığı: Hizmet süresi veya standart 15-30 dk)
            var availableSlots = new List<AvailableSlotResponseDto>();
            var slotStep = TimeSpan.FromMinutes(15);
            var durationSpan = TimeSpan.FromMinutes(durationMinutes);
            var nowUtc = DateTimeOffset.UtcNow;

            for (var cursor = dayStartUtc; cursor + durationSpan <= dayEndUtc; cursor = cursor.Add(slotStep))
            {
                var slotEnd = cursor + durationSpan;

                // Geçmiş saatler elenir
                if (cursor <= nowUtc) continue;

                // Mola çakışması kontrolü
                bool overlapsBreak = breakIntervals.Any(b => cursor < b.EndUtc && slotEnd > b.StartUtc);
                if (overlapsBreak) continue;

                // Özel saat kapatma / izin çakışması kontrolü (yalnızca çakışan saat aralığı kapatılır)
                bool overlapsException = staffExceptions.Any(e => cursor < e.EndAt && slotEnd > e.StartAt);
                if (overlapsException) continue;

                // Randevu çakışması kontrolü
                bool overlapsAppointment = activeAppointments.Any(a => cursor < a.EndAt && slotEnd > a.StartAt);
                if (overlapsAppointment) continue;

                var localStart = TimeZoneInfo.ConvertTime(cursor, tz);
                var localEnd = TimeZoneInfo.ConvertTime(slotEnd, tz);

                availableSlots.Add(new AvailableSlotResponseDto
                {
                    StartTime = TimeOnly.FromDateTime(localStart.DateTime),
                    EndTime = TimeOnly.FromDateTime(localEnd.DateTime),
                    StartAtUtc = cursor,
                    EndAtUtc = slotEnd
                });
            }

            return DataResult<IReadOnlyList<AvailableSlotResponseDto>>.Ok(availableSlots);
        }

        public async Task<IDataResult<AppointmentResponseDto>> CreateAppointmentAsync(CreateAppointmentRequestDto request, CancellationToken cancellationToken = default)
        {
            var customerUserId = _tenantService.UserId;
            if (!customerUserId.HasValue)
            {
                return DataResult<AppointmentResponseDto>.Fail("Randevu oluşturmak için oturum açmalısınız.", 401);
            }

            var branch = await _unitOfWork.Repository<Branch>().FirstOrDefaultAsync(b => b.Id == request.BranchId, cancellationToken);
            if (branch == null || !branch.IsActive)
            {
                return DataResult<AppointmentResponseDto>.Fail("Şube bulunamadı.", 404);
            }

            // Müşteri ceza & blokaj kontrolü
            var penaltyCheck = await _unitOfWork.Repository<CustomerPenalty>().Query()
                .IgnoreQueryFilters()
                .Where(p => p.CustomerUserId == customerUserId.Value &&
                            p.BusinessId == branch.BusinessId &&
                            p.IsActive &&
                            p.ExpiresAt > DateTimeOffset.UtcNow)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync(cancellationToken);

            if (penaltyCheck.Count >= 3)
            {
                var latest = penaltyCheck.First();
                var banEnd = latest.CreatedAt.AddDays(14);
                if (banEnd > DateTimeOffset.UtcNow)
                {
                    return DataResult<AppointmentResponseDto>.Fail(
                        $"Randevulara gelmeme (No-Show) ihlalleriniz nedeniyle {banEnd:dd.MM.yyyy} tarihine kadar bu işletmeden randevu alamazsınız.", 403);
                }
            }

            var branchService = await _unitOfWork.Repository<BranchService>().Query()
                .Include(bs => bs.Service)
                .FirstOrDefaultAsync(bs => bs.BranchId == request.BranchId && bs.ServiceId == request.ServiceId && bs.IsActive, cancellationToken);

            if (branchService == null || !branchService.Service.IsActive)
            {
                return DataResult<AppointmentResponseDto>.Fail("Hizmet bulunamadı veya şubede sunulmuyor.", 404);
            }

            var staffProvidesService = await _unitOfWork.Repository<StaffService>().AnyAsync(
                ss => ss.StaffProfileId == request.StaffProfileId && ss.BranchId == request.BranchId && ss.ServiceId == request.ServiceId,
                cancellationToken);

            if (!staffProvidesService)
            {
                return DataResult<AppointmentResponseDto>.Fail("Seçilen personel bu hizmeti vermemektedir.", 400);
            }

            var targetStaffProfile = await _unitOfWork.Repository<StaffProfile>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Include(sp => sp.BusinessMember)
                .FirstOrDefaultAsync(sp => sp.Id == request.StaffProfileId, cancellationToken);

            if (targetStaffProfile == null || !targetStaffProfile.IsBookable || !targetStaffProfile.BusinessMember.IsActive || targetStaffProfile.BusinessMember.BusinessId != branch.BusinessId)
            {
                return DataResult<AppointmentResponseDto>.Fail("Seçilen personel şu an bu şubede randevuya uygun değildir.", 400);
            }

            if (targetStaffProfile.BusinessMember.UserId == customerUserId.Value)
            {
                return DataResult<AppointmentResponseDto>.Fail("Kendi kendinize randevu oluşturamazsınız.", 400);
            }

            var priceSnapshot = branchService.PriceOverride ?? branchService.Service.BasePrice;
            var durationSnapshot = branchService.DurationOverride ?? branchService.Service.DurationMinutes;
            if (durationSnapshot <= 0) durationSnapshot = 30;

            var startUtc = request.StartAt.ToUniversalTime();
            var endUtc = startUtc.AddMinutes(durationSnapshot);

            if (startUtc <= DateTimeOffset.UtcNow)
            {
                return DataResult<AppointmentResponseDto>.Fail("Geçmiş zamana randevu alınamaz.", 400);
            }

            // Şube kapalı/tatil kontrolü (yalnızca Closed tipindeki istisnalar)
            var hasBranchClosure = await _unitOfWork.Repository<BranchScheduleException>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .AnyAsync(
                    e => e.BranchId == request.BranchId &&
                         e.Type == BranchScheduleExceptionType.Closed &&
                         e.StartAt < endUtc &&
                         e.EndAt > startUtc,
                    cancellationToken);

            if (hasBranchClosure)
            {
                return DataResult<AppointmentResponseDto>.Fail("Şube seçilen tarih/saat aralığında kapalıdır.", 400);
            }

            // Personel mesai ve mola kontrolü (yerel saat)
            var localStart = startUtc.ToOffset(TimeSpan.FromHours(3));
            var localEnd = endUtc.ToOffset(TimeSpan.FromHours(3));
            var dayOfWeek = localStart.DayOfWeek;
            var startTimeOnly = TimeOnly.FromDateTime(localStart.DateTime);
            var endTimeOnly = TimeOnly.FromDateTime(localEnd.DateTime);

            var staffWorkingHour = await _unitOfWork.Repository<StaffWorkingHour>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Include(wh => wh.Breaks)
                .FirstOrDefaultAsync(
                    wh => wh.StaffProfileId == request.StaffProfileId &&
                          wh.BranchId == request.BranchId &&
                          wh.DayOfWeek == dayOfWeek,
                    cancellationToken);

            if (staffWorkingHour == null || startTimeOnly < staffWorkingHour.StartTime || endTimeOnly > staffWorkingHour.EndTime || localEnd.Date != localStart.Date)
            {
                return DataResult<AppointmentResponseDto>.Fail("Seçilen saat personelin mesai saatleri dışındadır.", 400);
            }

            if (staffWorkingHour.Breaks.Any(b => startTimeOnly < b.EndTime && endTimeOnly > b.StartTime))
            {
                return DataResult<AppointmentResponseDto>.Fail("Seçilen saat personelin mola aralığıyla çakışmaktadır.", 400);
            }

            var hasBlockedSlot = await _unitOfWork.Repository<StaffScheduleException>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .AnyAsync(
                    e => e.StaffProfileId == request.StaffProfileId &&
                         e.BranchId == request.BranchId &&
                         e.StartAt < endUtc &&
                         e.EndAt > startUtc,
                    cancellationToken);

            if (hasBlockedSlot)
            {
                return DataResult<AppointmentResponseDto>.Fail("Personel seçilen saat aralığında kapalı veya izinlidir.", 400);
            }

            await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                // Şubeler arası dahil çift rezervasyon kontrolü (DB GIST constraint ile çift katmanlı koruma)
                var hasConflict = await _unitOfWork.Repository<Appointment>().QueryAsNoTracking()
                    .IgnoreQueryFilters()
                    .AnyAsync(
                        a => a.StaffProfileId == request.StaffProfileId &&
                             (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed) &&
                             a.StartAt < endUtc && a.EndAt > startUtc,
                        cancellationToken);

                if (hasConflict)
                {
                    return DataResult<AppointmentResponseDto>.Fail("Seçilen zaman diliminde personel doludur. Lütfen başka bir slot seçiniz.", 409);
                }

                var appointment = new Appointment
                {
                    Id = Guid.NewGuid(),
                    CustomerUserId = customerUserId.Value,
                    BusinessId = branch.BusinessId,
                    BranchId = branch.Id,
                    StaffProfileId = request.StaffProfileId,
                    ServiceId = request.ServiceId,
                    StartAt = startUtc,
                    EndAt = endUtc,
                    PriceSnapshot = priceSnapshot,
                    DurationSnapshot = durationSnapshot,
                    Status = AppointmentStatus.Pending
                };

                await _unitOfWork.Repository<Appointment>().AddAsync(appointment, cancellationToken);

                // Audit History
                var statusHistory = new AppointmentStatusHistory
                {
                    Id = Guid.NewGuid(),
                    AppointmentId = appointment.Id,
                    OldStatus = null,
                    NewStatus = AppointmentStatus.Pending,
                    ChangedByUserId = customerUserId.Value,
                    Note = "Randevu müşteri tarafından oluşturuldu."
                };

                await _unitOfWork.Repository<AppointmentStatusHistory>().AddAsync(statusHistory, cancellationToken);
                await _unitOfWork.CommitTransactionAsync(cancellationToken);

                var customer = await _unitOfWork.Repository<User>().GetByIdAsync(customerUserId.Value, cancellationToken);
                var staff = await _unitOfWork.Repository<StaffProfile>().Query()
                    .Include(sp => sp.BusinessMember).ThenInclude(bm => bm.User)
                    .FirstOrDefaultAsync(sp => sp.Id == request.StaffProfileId, cancellationToken);

                var customerDisplay = $"{customer?.FirstName} {customer?.LastName}".Trim();
                var formattedDate = startUtc.ToOffset(TimeSpan.FromHours(3)).ToString("dd.MM.yyyy HH:mm");

                await TryNotifyBusinessAndStaffAsync(
                    appointment.BusinessId,
                    staff?.BusinessMember.UserId,
                    NotificationType.AppointmentCreated,
                    "Yeni Randevu Talebi",
                    $"{customerDisplay}, {branch.Name} şubesinde {branchService.Service.Name} hizmeti için {formattedDate} tarihine randevu oluşturdu.",
                    appointment.Id,
                    cancellationToken);

                var response = new AppointmentResponseDto
                {
                    Id = appointment.Id,
                    CustomerUserId = appointment.CustomerUserId,
                    CustomerFullName = $"{customer?.FirstName} {customer?.LastName}",
                    CustomerPhoneNumber = customer?.PhoneNumber ?? string.Empty,
                    BusinessId = appointment.BusinessId,
                    BranchId = appointment.BranchId,
                    BranchName = branch.Name,
                    StaffProfileId = appointment.StaffProfileId,
                    StaffFullName = $"{staff?.BusinessMember.User.FirstName} {staff?.BusinessMember.User.LastName}",
                    ServiceId = appointment.ServiceId,
                    ServiceName = branchService.Service.Name,
                    StartAt = appointment.StartAt,
                    EndAt = appointment.EndAt,
                    PriceSnapshot = appointment.PriceSnapshot,
                    DurationSnapshot = appointment.DurationSnapshot,
                    Status = (int)appointment.Status,
                    StatusName = appointment.Status.ToString()
                };

                return DataResult<AppointmentResponseDto>.Ok(response, "Randevu başarıyla oluşturuldu.");
            }
            catch (DbUpdateException ex) when (IsOverlapExclusionViolation(ex))
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                return DataResult<AppointmentResponseDto>.Fail("Seçilen zaman diliminde personel doludur. Lütfen başka bir slot seçiniz.", 409);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }

        private static bool IsOverlapExclusionViolation(DbUpdateException ex)
        {
            var inner = ex.InnerException;
            while (inner != null)
            {
                var sqlStateProp = inner.GetType().GetProperty("SqlState");
                if (sqlStateProp?.GetValue(inner) is string sqlState && sqlState == "23P01")
                {
                    return true;
                }
                inner = inner.InnerException;
            }
            return false;
        }

        public async Task<IResult> CancelAppointmentAsync(CancelAppointmentRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var appointmentRepo = _unitOfWork.Repository<Appointment>();
            var appointment = await appointmentRepo.GetByIdAsync(request.AppointmentId, cancellationToken);
            if (appointment == null)
            {
                return Result.Fail("Randevu bulunamadı.", 404);
            }

            if (appointment.Status is AppointmentStatus.Completed or AppointmentStatus.Cancelled or AppointmentStatus.NoShow)
            {
                return Result.Fail("Tamamlanmış, gelinmemiş veya zaten iptal edilmiş randevular iptal edilemez.", 400);
            }

            // Randevuyu sadece müşteri, işletme sahibi/yöneticisi veya atanan personel iptal edebilir
            var isCustomer = appointment.CustomerUserId == userId.Value;
            var isBusinessStaff = _tenantService.BusinessId.HasValue && _tenantService.BusinessId.Value == appointment.BusinessId;

            if (!isCustomer && !isBusinessStaff && !_tenantService.IsSuperAdmin)
            {
                return Result.Fail("Bu randevuyu iptal etme yetkiniz bulunmamaktadır.", 403);
            }

            var oldStatus = appointment.Status;
            appointment.Status = AppointmentStatus.Cancelled;
            appointment.CancelledAt = DateTimeOffset.UtcNow;
            appointment.CancellationReason = request.Reason.Trim();
            appointment.CancelledByUserId = userId.Value;

            appointmentRepo.Update(appointment);

            var history = new AppointmentStatusHistory
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointment.Id,
                OldStatus = oldStatus,
                NewStatus = AppointmentStatus.Cancelled,
                ChangedByUserId = userId.Value,
                Note = request.Reason.Trim()
            };

            await _unitOfWork.Repository<AppointmentStatusHistory>().AddAsync(history, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var cancelDate = appointment.StartAt.ToOffset(TimeSpan.FromHours(3)).ToString("dd.MM.yyyy HH:mm");
            if (isCustomer)
            {
                var staffProfile = await _unitOfWork.Repository<StaffProfile>().Query()
                    .Include(sp => sp.BusinessMember)
                    .FirstOrDefaultAsync(sp => sp.Id == appointment.StaffProfileId, cancellationToken);
                await TryNotifyBusinessAndStaffAsync(
                    appointment.BusinessId,
                    staffProfile?.BusinessMember.UserId,
                    NotificationType.AppointmentCancelled,
                    "Randevu Müşteri Tarafından İptal Edildi",
                    $"{cancelDate} tarihli randevu müşteri tarafından iptal edildi. Neden: {request.Reason.Trim()}",
                    appointment.Id,
                    cancellationToken);
            }
            else
            {
                await TrySendNotificationAsync(
                    appointment.CustomerUserId,
                    NotificationType.AppointmentCancelled,
                    "Randevunuz İptal Edildi",
                    $"{cancelDate} tarihli randevunuz salon tarafından iptal edildi. Neden: {request.Reason.Trim()}",
                    appointment.Id,
                    cancellationToken);
            }

            return Result.Ok("Randevu başarıyla iptal edildi.");
        }

        public async Task<IResult> UpdateStatusAsync(UpdateAppointmentStatusRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            var businessId = _tenantService.BusinessId;

            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            if (!Enum.IsDefined(typeof(AppointmentStatus), request.NewStatus))
            {
                return Result.Fail("Geçersiz randevu durumu.", 400);
            }

            var appointmentRepo = _unitOfWork.Repository<Appointment>();
            var appointment = await appointmentRepo.FirstOrDefaultAsync(
                a => a.Id == request.AppointmentId && a.BusinessId == businessId.Value,
                cancellationToken);

            if (appointment == null)
            {
                return Result.Fail("Randevu bulunamadı.", 404);
            }

            return await ApplyStatusTransitionAsync(
                appointment,
                (AppointmentStatus)request.NewStatus,
                userId,
                request.Note,
                "İşletme tarafından iptal edildi.",
                cancellationToken);
        }

        private async Task<IResult> ApplyStatusTransitionAsync(
            Appointment appointment,
            AppointmentStatus newStatus,
            Guid? changedByUserId,
            string? note,
            string defaultCancelReason,
            CancellationToken cancellationToken)
        {
            var now = DateTimeOffset.UtcNow;
            var oldStatus = appointment.Status;

            if (oldStatus is AppointmentStatus.Completed or AppointmentStatus.Cancelled or AppointmentStatus.NoShow)
            {
                return Result.Fail("Tamamlanmış, iptal edilmiş veya gelmedi olarak işaretlenmiş randevuların durumu değiştirilemez.", 400);
            }

            if (oldStatus == AppointmentStatus.Pending)
            {
                if (newStatus is not (AppointmentStatus.Confirmed or AppointmentStatus.Cancelled))
                {
                    return Result.Fail("Onaylanmamış bir randevu tamamlandı veya gelmedi olarak işaretlenemez.", 400);
                }

                if (newStatus == AppointmentStatus.Confirmed && now >= appointment.StartAt)
                {
                    return Result.Fail("Randevu saati geçtiği için artık onaylanamaz.", 400);
                }
            }
            else if (oldStatus == AppointmentStatus.Confirmed)
            {
                if (newStatus is not (AppointmentStatus.Completed or AppointmentStatus.NoShow or AppointmentStatus.Cancelled))
                {
                    return Result.Fail("Onaylanmış bir randevu yalnızca tamamlandı, gelmedi veya iptal durumuna geçirilebilir.", 400);
                }

                if (newStatus is AppointmentStatus.Completed or AppointmentStatus.NoShow && now < appointment.StartAt)
                {
                    return Result.Fail("Randevu saati gelmeden tamamlandı veya gelmedi olarak işaretlenemez.", 400);
                }
            }

            appointment.Status = newStatus;
            if (newStatus == AppointmentStatus.Cancelled)
            {
                appointment.CancelledAt = now;
                appointment.CancelledByUserId = changedByUserId;
                appointment.CancellationReason = string.IsNullOrWhiteSpace(note) ? defaultCancelReason : note.Trim();
            }

            _unitOfWork.Repository<Appointment>().Update(appointment);

            var history = new AppointmentStatusHistory
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointment.Id,
                OldStatus = oldStatus,
                NewStatus = newStatus,
                ChangedByUserId = changedByUserId,
                Note = note?.Trim()
            };

            await _unitOfWork.Repository<AppointmentStatusHistory>().AddAsync(history, cancellationToken);

            if (newStatus == AppointmentStatus.NoShow)
            {
                var hasPenalty = await _unitOfWork.Repository<CustomerPenalty>().Query()
                    .IgnoreQueryFilters()
                    .AnyAsync(p => p.AppointmentId == appointment.Id, cancellationToken);

                if (!hasPenalty)
                {
                    var autoPenalty = new CustomerPenalty
                    {
                        Id = Guid.NewGuid(),
                        BusinessId = appointment.BusinessId,
                        CustomerUserId = appointment.CustomerUserId,
                        AppointmentId = appointment.Id,
                        Reason = PenaltyReason.NoShow,
                        Note = string.IsNullOrWhiteSpace(note)
                            ? "Randevuya gelmedi (Otomatik No-Show cezası)."
                            : note.Trim(),
                        IsActive = true,
                        ExpiresAt = now.AddDays(30)
                    };

                    await _unitOfWork.Repository<CustomerPenalty>().AddAsync(autoPenalty, cancellationToken);
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var apptDateStr = appointment.StartAt.ToOffset(TimeSpan.FromHours(3)).ToString("dd.MM.yyyy HH:mm");
            var (notifType, notifTitle, notifMessage) = newStatus switch
            {
                AppointmentStatus.Confirmed => (
                    NotificationType.AppointmentConfirmed,
                    "Randevunuz Onaylandı",
                    $"{apptDateStr} tarihli randevunuz onaylandı. Sizi bekliyoruz!"
                ),
                AppointmentStatus.Completed => (
                    NotificationType.AppointmentCompleted,
                    "Randevunuz Tamamlandı",
                    $"{apptDateStr} tarihli hizmetiniz tamamlandı. Salon detayından deneyiminizi değerlendirebilirsiniz."
                ),
                AppointmentStatus.NoShow => (
                    NotificationType.General,
                    "Randevuya Gelmedi (No-Show)",
                    $"{apptDateStr} tarihli randevunuza katılmadığınız için hesabınıza 1 No-Show ceza puanı işlendi."
                ),
                AppointmentStatus.Cancelled => (
                    NotificationType.AppointmentCancelled,
                    "Randevunuz İptal Edildi",
                    $"{apptDateStr} tarihli randevunuz iptal edildi."
                ),
                _ => (NotificationType.General, string.Empty, string.Empty)
            };

            if (!string.IsNullOrEmpty(notifTitle))
            {
                await TrySendNotificationAsync(
                    appointment.CustomerUserId,
                    notifType,
                    notifTitle,
                    notifMessage,
                    appointment.Id,
                    cancellationToken);
            }

            return Result.Ok("Randevu durumu güncellendi.");
        }

        private async Task TrySendNotificationAsync(
            Guid userId,
            NotificationType type,
            string title,
            string message,
            Guid? relatedEntityId,
            CancellationToken cancellationToken)
        {
            try
            {
                await _notificationService.SendNotificationAsync(userId, type, title, message, relatedEntityId, cancellationToken);
            }
            catch
            {
                // Bildirim hatası randevu akışını kesintiye uğratmamalı
            }
        }

        private async Task TryNotifyBusinessAndStaffAsync(
            Guid businessId,
            Guid? assignedStaffUserId,
            NotificationType type,
            string title,
            string message,
            Guid? relatedEntityId,
            CancellationToken cancellationToken)
        {
            try
            {
                var recipientIds = await _unitOfWork.Repository<BusinessMember>().Query()
                    .IgnoreQueryFilters()
                    .Where(bm => bm.BusinessId == businessId &&
                                 bm.IsActive &&
                                 (bm.Role == BusinessRole.Owner || bm.Role == BusinessRole.Manager))
                    .Select(bm => bm.UserId)
                    .ToListAsync(cancellationToken);

                if (assignedStaffUserId.HasValue)
                {
                    recipientIds.Add(assignedStaffUserId.Value);
                }

                foreach (var recipientId in recipientIds.Distinct())
                {
                    await TrySendNotificationAsync(recipientId, type, title, message, relatedEntityId, cancellationToken);
                }
            }
            catch
            {
                // Bildirim hatası randevu akışını kesintiye uğratmamalı
            }
        }

        private static AppointmentResponseDto MapToDto(Appointment a) => new()
        {
            Id = a.Id,
            CustomerUserId = a.CustomerUserId,
            CustomerFullName = a.Customer != null ? $"{a.Customer.FirstName} {a.Customer.LastName}".Trim() : string.Empty,
            CustomerPhoneNumber = a.Customer?.PhoneNumber ?? string.Empty,
            BusinessId = a.BusinessId,
            BranchId = a.BranchId,
            BranchName = a.Branch?.Name ?? string.Empty,
            StaffProfileId = a.StaffProfileId,
            StaffFullName = a.StaffProfile?.BusinessMember?.User != null
                ? $"{a.StaffProfile.BusinessMember.User.FirstName} {a.StaffProfile.BusinessMember.User.LastName}".Trim()
                : string.Empty,
            ServiceId = a.ServiceId,
            ServiceName = a.Service?.Name ?? string.Empty,
            StartAt = a.StartAt,
            EndAt = a.EndAt,
            PriceSnapshot = a.PriceSnapshot,
            DurationSnapshot = a.DurationSnapshot,
            Status = (int)a.Status,
            StatusName = a.Status.ToString(),
            CancellationReason = a.CancellationReason,
            HasPendingReschedule = a.Status == AppointmentStatus.Confirmed && a.ProposedStartAt.HasValue,
            ProposedStartAt = a.ProposedStartAt,
            ProposedEndAt = a.ProposedEndAt,
            RescheduleNote = a.RescheduleNote,
            RescheduleProposedAt = a.RescheduleProposedAt
        };

        private async Task AutoExpireUnacceptedReschedulesAsync(List<Appointment> appointments, CancellationToken cancellationToken)
        {
            var now = DateTimeOffset.UtcNow;
            var expired = appointments
                .Where(a => a.Status == AppointmentStatus.Confirmed &&
                            a.ProposedStartAt.HasValue &&
                            a.StartAt <= now)
                .ToList();

            if (expired.Count == 0) return;

            var appointmentRepo = _unitOfWork.Repository<Appointment>();
            var historyRepo = _unitOfWork.Repository<AppointmentStatusHistory>();
            const string reason = "Saat değişikliği teklifi randevu saatine kadar onaylanmadığı için otomatik iptal edildi.";

            foreach (var appt in expired)
            {
                appt.Status = AppointmentStatus.Cancelled;
                appt.CancelledAt = now;
                appt.CancellationReason = reason;
                appt.ProposedStartAt = null;
                appt.ProposedEndAt = null;
                appt.RescheduleNote = null;
                appt.RescheduleProposedByUserId = null;
                appt.RescheduleProposedAt = null;
                appointmentRepo.Update(appt);

                await historyRepo.AddAsync(new AppointmentStatusHistory
                {
                    Id = Guid.NewGuid(),
                    AppointmentId = appt.Id,
                    OldStatus = AppointmentStatus.Confirmed,
                    NewStatus = AppointmentStatus.Cancelled,
                    ChangedByUserId = null,
                    Note = reason
                }, cancellationToken);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            foreach (var appt in expired)
            {
                var dateStr = appt.StartAt.ToOffset(TimeSpan.FromHours(3)).ToString("dd.MM.yyyy HH:mm");
                await TrySendNotificationAsync(
                    appt.CustomerUserId,
                    NotificationType.AppointmentCancelled,
                    "Randevu Otomatik İptal Edildi",
                    $"{dateStr} tarihli randevunuz için gönderilen saat değişikliği teklifi zamanında onaylanmadığından randevu otomatik iptal edildi.",
                    appt.Id,
                    cancellationToken);

                await TryNotifyBusinessAndStaffAsync(
                    appt.BusinessId,
                    appt.StaffProfile?.BusinessMember?.UserId,
                    NotificationType.AppointmentCancelled,
                    "Saat Değişikliği Onaylanmadı — İptal",
                    $"{dateStr} tarihli randevunun saat değişikliği teklifi müşteri tarafından zamanında onaylanmadığı için otomatik iptal edildi.",
                    appt.Id,
                    cancellationToken);
            }
        }

        public async Task<IResult> ProposeRescheduleAsync(ProposeRescheduleRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var appointmentRepo = _unitOfWork.Repository<Appointment>();
            var appointment = await appointmentRepo.Query()
                .IgnoreQueryFilters()
                .Include(a => a.Branch)
                .Include(a => a.Service)
                .Include(a => a.StaffProfile).ThenInclude(sp => sp.BusinessMember)
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId, cancellationToken);

            if (appointment == null)
            {
                return Result.Fail("Randevu bulunamadı.", 404);
            }

            var isAssignedStaff = appointment.StaffProfile.BusinessMember.UserId == userId.Value && appointment.StaffProfile.BusinessMember.IsActive;
            var isBusinessManager = _tenantService.BusinessId.HasValue && _tenantService.BusinessId.Value == appointment.BusinessId;

            if (!isAssignedStaff && !isBusinessManager)
            {
                return Result.Fail("Bu randevu için saat değişikliği teklif etme yetkiniz yok.", 403);
            }

            if (appointment.Status != AppointmentStatus.Confirmed)
            {
                return Result.Fail("Yalnızca onaylanmış randevular için saat değişikliği teklif edilebilir.", 400);
            }

            var now = DateTimeOffset.UtcNow;
            if (now >= appointment.StartAt)
            {
                return Result.Fail("Randevu saati geçtiği için saat değişikliği teklif edilemez.", 400);
            }

            var newStartUtc = request.NewStartAt.ToUniversalTime();
            var durationMinutes = appointment.DurationSnapshot > 0 ? appointment.DurationSnapshot : 30;
            var newEndUtc = newStartUtc.AddMinutes(durationMinutes);

            if (newStartUtc <= now)
            {
                return Result.Fail("Teklif edilen yeni saat gelecekte olmalıdır.", 400);
            }

            if (newStartUtc == appointment.StartAt)
            {
                return Result.Fail("Teklif edilen saat mevcut randevu saatiyle aynı olamaz.", 400);
            }

            // Personelin o günkü çalışma saatleri ve mola kontrolü
            TimeZoneInfo tz;
            try
            {
                tz = TimeZoneInfo.FindSystemTimeZoneById(appointment.Branch.TimeZoneId ?? "Europe/Istanbul");
            }
            catch
            {
                tz = TimeZoneInfo.Utc;
            }

            var localNewStart = TimeZoneInfo.ConvertTime(newStartUtc, tz);
            var localNewEnd = TimeZoneInfo.ConvertTime(newEndUtc, tz);
            var localDate = DateOnly.FromDateTime(localNewStart.DateTime);

            var staffWorkingHour = await _unitOfWork.Repository<StaffWorkingHour>().Query()
                .Include(swh => swh.Breaks)
                .FirstOrDefaultAsync(
                    swh => swh.StaffProfileId == appointment.StaffProfileId &&
                           swh.BranchId == appointment.BranchId &&
                           swh.DayOfWeek == localDate.DayOfWeek,
                    cancellationToken);

            if (staffWorkingHour == null)
            {
                return Result.Fail("Personel seçilen günde bu şubede çalışmamaktadır.", 400);
            }

            var startTimeOnly = TimeOnly.FromDateTime(localNewStart.DateTime);
            var endTimeOnly = TimeOnly.FromDateTime(localNewEnd.DateTime);
            if (localNewStart.Date != localNewEnd.Date || startTimeOnly < staffWorkingHour.StartTime || endTimeOnly > staffWorkingHour.EndTime)
            {
                return Result.Fail("Seçilen saat personelin mesai saatleri dışındadır.", 400);
            }

            var overlapsBreak = staffWorkingHour.Breaks.Any(b => startTimeOnly < b.EndTime && endTimeOnly > b.StartTime);
            if (overlapsBreak)
            {
                return Result.Fail("Seçilen saat personelin mola aralığıyla çakışmaktadır.", 400);
            }

            var overlapsException = await _unitOfWork.Repository<StaffScheduleException>().AnyAsync(
                e => e.StaffProfileId == appointment.StaffProfileId &&
                     e.BranchId == appointment.BranchId &&
                     e.StartAt < newEndUtc &&
                     e.EndAt > newStartUtc,
                cancellationToken);

            if (overlapsException)
            {
                return Result.Fail("Seçilen saat aralığı personelin kapalı/izinli olduğu zamana denk gelmektedir.", 400);
            }

            // Aynı personelin (diğer şubeler dahil) başka bir aktif randevusuyla çakışma kontrolü
            var hasConflict = await appointmentRepo.Query()
                .IgnoreQueryFilters()
                .AnyAsync(a => a.Id != appointment.Id &&
                               a.StaffProfileId == appointment.StaffProfileId &&
                               (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed) &&
                               a.StartAt < newEndUtc &&
                               a.EndAt > newStartUtc,
                          cancellationToken);

            if (hasConflict)
            {
                return Result.Fail("Seçilen yeni saat diliminde personelin başka bir randevusu bulunmaktadır.", 409);
            }

            appointment.ProposedStartAt = newStartUtc;
            appointment.ProposedEndAt = newEndUtc;
            appointment.RescheduleNote = request.Note?.Trim();
            appointment.RescheduleProposedByUserId = userId.Value;
            appointment.RescheduleProposedAt = now;

            appointmentRepo.Update(appointment);

            var oldStr = appointment.StartAt.ToOffset(TimeSpan.FromHours(3)).ToString("dd.MM.yyyy HH:mm");
            var newStr = newStartUtc.ToOffset(TimeSpan.FromHours(3)).ToString("dd.MM.yyyy HH:mm");

            await _unitOfWork.Repository<AppointmentStatusHistory>().AddAsync(new AppointmentStatusHistory
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointment.Id,
                OldStatus = appointment.Status,
                NewStatus = appointment.Status,
                ChangedByUserId = userId.Value,
                Note = $"Saat değişikliği teklifi gönderildi: {oldStr} -> {newStr}" +
                       (string.IsNullOrWhiteSpace(request.Note) ? string.Empty : $" ({request.Note.Trim()})")
            }, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            await TrySendNotificationAsync(
                appointment.CustomerUserId,
                NotificationType.AppointmentReminder,
                "Randevu Saat Değişikliği Teklifi",
                $"{appointment.Branch.Name} şubesindeki {oldStr} randevunuz için {newStr} yeni saat teklifi gönderildi. Onaylamazsanız randevu saatinde otomatik iptal edilecektir.",
                appointment.Id,
                cancellationToken);

            return Result.Ok("Saat değişikliği teklifi müşteriye iletildi.");
        }

        public async Task<IResult> RespondToRescheduleAsync(RespondRescheduleRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var appointmentRepo = _unitOfWork.Repository<Appointment>();
            var appointment = await appointmentRepo.Query()
                .IgnoreQueryFilters()
                .Include(a => a.Branch)
                .Include(a => a.Customer)
                .Include(a => a.StaffProfile).ThenInclude(sp => sp.BusinessMember)
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId, cancellationToken);

            if (appointment == null)
            {
                return Result.Fail("Randevu bulunamadı.", 404);
            }

            if (appointment.CustomerUserId != userId.Value)
            {
                return Result.Fail("Yalnızca kendi randevunuzdaki saat değişikliği teklifini yanıtlayabilirsiniz.", 403);
            }

            if (appointment.Status != AppointmentStatus.Confirmed || !appointment.ProposedStartAt.HasValue || !appointment.ProposedEndAt.HasValue)
            {
                return Result.Fail("Bu randevu için bekleyen bir saat değişikliği teklifi bulunmuyor.", 400);
            }

            var now = DateTimeOffset.UtcNow;
            if (now >= appointment.StartAt)
            {
                await AutoExpireUnacceptedReschedulesAsync(new List<Appointment> { appointment }, cancellationToken);
                return Result.Fail("Teklifin onay süresi dolduğu için randevu otomatik iptal edildi.", 400);
            }

            var oldStr = appointment.StartAt.ToOffset(TimeSpan.FromHours(3)).ToString("dd.MM.yyyy HH:mm");
            var newStartUtc = appointment.ProposedStartAt.Value;
            var newEndUtc = appointment.ProposedEndAt.Value;
            var newStr = newStartUtc.ToOffset(TimeSpan.FromHours(3)).ToString("dd.MM.yyyy HH:mm");
            var customerName = $"{appointment.Customer.FirstName} {appointment.Customer.LastName}".Trim();

            if (request.Accept)
            {
                if (newStartUtc <= now)
                {
                    return Result.Fail("Teklif edilen yeni saat geçmişte kaldığı için onaylanamaz.", 400);
                }

                var hasConflict = await appointmentRepo.Query()
                    .IgnoreQueryFilters()
                    .AnyAsync(a => a.Id != appointment.Id &&
                                   a.StaffProfileId == appointment.StaffProfileId &&
                                   (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed) &&
                                   a.StartAt < newEndUtc &&
                                   a.EndAt > newStartUtc,
                              cancellationToken);

                if (hasConflict)
                {
                    return Result.Fail("Teklif edilen saat dilimi az önce başka bir randevuyla doldu. Lütfen salonla iletişime geçin.", 409);
                }

                appointment.StartAt = newStartUtc;
                appointment.EndAt = newEndUtc;
                appointment.ReminderSentAt = null; // Yeni saat için 2 saat kala hatırlatma tekrar gönderilebilsin
                appointment.ProposedStartAt = null;
                appointment.ProposedEndAt = null;
                appointment.RescheduleNote = null;
                appointment.RescheduleProposedByUserId = null;
                appointment.RescheduleProposedAt = null;
                appointmentRepo.Update(appointment);

                await _unitOfWork.Repository<AppointmentStatusHistory>().AddAsync(new AppointmentStatusHistory
                {
                    Id = Guid.NewGuid(),
                    AppointmentId = appointment.Id,
                    OldStatus = AppointmentStatus.Confirmed,
                    NewStatus = AppointmentStatus.Confirmed,
                    ChangedByUserId = userId.Value,
                    Note = $"Müşteri yeni saati onayladı: {oldStr} -> {newStr}"
                }, cancellationToken);

                try
                {
                    await _unitOfWork.SaveChangesAsync(cancellationToken);
                }
                catch (DbUpdateException ex) when (IsOverlapExclusionViolation(ex))
                {
                    return Result.Fail("Teklif edilen saat dilimi başka bir randevu tarafından dolduruldu. Lütfen işletmeyle iletişime geçiniz.", 409);
                }

                await TryNotifyBusinessAndStaffAsync(
                    appointment.BusinessId,
                    appointment.StaffProfile.BusinessMember.UserId,
                    NotificationType.AppointmentConfirmed,
                    "Saat Değişikliği Onaylandı",
                    $"{customerName}, {appointment.Branch.Name} şubesindeki randevusu için {newStr} yeni saat teklifini onayladı.",
                    appointment.Id,
                    cancellationToken);

                return Result.Ok("Yeni randevu saati onaylandı ve takviminiz güncellendi.");
            }
            else
            {
                const string rejectReason = "Müşteri saat değişikliği teklifini kabul etmediği için randevu iptal edildi.";
                appointment.Status = AppointmentStatus.Cancelled;
                appointment.CancelledAt = now;
                appointment.CancelledByUserId = userId.Value;
                appointment.CancellationReason = rejectReason;
                appointment.ProposedStartAt = null;
                appointment.ProposedEndAt = null;
                appointment.RescheduleNote = null;
                appointment.RescheduleProposedByUserId = null;
                appointment.RescheduleProposedAt = null;
                appointmentRepo.Update(appointment);

                await _unitOfWork.Repository<AppointmentStatusHistory>().AddAsync(new AppointmentStatusHistory
                {
                    Id = Guid.NewGuid(),
                    AppointmentId = appointment.Id,
                    OldStatus = AppointmentStatus.Confirmed,
                    NewStatus = AppointmentStatus.Cancelled,
                    ChangedByUserId = userId.Value,
                    Note = rejectReason
                }, cancellationToken);

                await _unitOfWork.SaveChangesAsync(cancellationToken);

                await TryNotifyBusinessAndStaffAsync(
                    appointment.BusinessId,
                    appointment.StaffProfile.BusinessMember.UserId,
                    NotificationType.AppointmentCancelled,
                    "Saat Değişikliği Reddedildi — İptal",
                    $"{customerName}, {oldStr} -> {newStr} saat değişikliği teklifini reddetti; randevu iptal edildi.",
                    appointment.Id,
                    cancellationToken);

                return Result.Ok("Saat değişikliği teklifi reddedildi ve randevu iptal edildi.");
            }
        }

        public async Task<IDataResult<IReadOnlyList<AppointmentResponseDto>>> GetMyAppointmentsAsync(int skip = 0, int take = 20, int? status = null, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<IReadOnlyList<AppointmentResponseDto>>.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var safeSkip = Math.Max(0, skip);
            var safeTake = Math.Clamp(take, 1, 100);

            // Süresi dolmuş saat değişikliği tekliflerini (varsa) yalnızca ilk sayfada hafifçe temizle
            if (safeSkip == 0)
            {
                var now = DateTimeOffset.UtcNow;
                var expiredCandidates = await _unitOfWork.Repository<Appointment>().Query()
                    .IgnoreQueryFilters()
                    .Include(a => a.Branch)
                    .Include(a => a.Customer)
                    .Include(a => a.StaffProfile).ThenInclude(sp => sp.BusinessMember)
                    .Where(a => a.CustomerUserId == userId.Value &&
                                a.Status == AppointmentStatus.Confirmed &&
                                a.ProposedStartAt != null &&
                                a.StartAt <= now)
                    .ToListAsync(cancellationToken);

                if (expiredCandidates.Count > 0)
                {
                    await AutoExpireUnacceptedReschedulesAsync(expiredCandidates, cancellationToken);
                }
            }

            var query = _unitOfWork.Repository<Appointment>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Include(a => a.Branch)
                .Include(a => a.Service)
                .Include(a => a.StaffProfile).ThenInclude(sp => sp.BusinessMember).ThenInclude(bm => bm.User)
                .Include(a => a.Customer)
                .Where(a => a.CustomerUserId == userId.Value);

            if (status.HasValue && Enum.IsDefined(typeof(AppointmentStatus), status.Value))
            {
                var statusEnum = (AppointmentStatus)status.Value;
                query = query.Where(a => a.Status == statusEnum);
            }

            var appointments = await query
                .OrderByDescending(a => a.StartAt)
                .Skip(safeSkip)
                .Take(safeTake)
                .ToListAsync(cancellationToken);

            var reviewedIds = await GetReviewedAppointmentIdsAsync(appointments, cancellationToken);
            var dtos = appointments.Select(a =>
            {
                var dto = MapToDto(a);
                dto.HasReview = reviewedIds.Contains(a.Id);
                return dto;
            }).ToList();

            return DataResult<IReadOnlyList<AppointmentResponseDto>>.Ok(dtos);
        }

        public async Task<IDataResult<IReadOnlyList<AppointmentResponseDto>>> GetMyWorkAppointmentsAsync(int skip = 0, int take = 50, int? status = null, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
                return DataResult<IReadOnlyList<AppointmentResponseDto>>.Fail("Oturum açmanız gerekmektedir.", 401);

            var safeSkip = Math.Max(0, skip);
            var safeTake = Math.Clamp(take, 1, 100);

            if (safeSkip == 0)
            {
                var now = DateTimeOffset.UtcNow;
                var expiredCandidates = await _unitOfWork.Repository<Appointment>().Query()
                    .IgnoreQueryFilters()
                    .Include(a => a.Branch)
                    .Include(a => a.Customer)
                    .Include(a => a.StaffProfile).ThenInclude(sp => sp.BusinessMember)
                    .Where(a => a.StaffProfile.BusinessMember.UserId == userId.Value &&
                                a.Status == AppointmentStatus.Confirmed &&
                                a.ProposedStartAt != null &&
                                a.StartAt <= now)
                    .ToListAsync(cancellationToken);

                if (expiredCandidates.Count > 0)
                {
                    await AutoExpireUnacceptedReschedulesAsync(expiredCandidates, cancellationToken);
                }
            }

            var query = _unitOfWork.Repository<Appointment>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Include(a => a.Branch).Include(a => a.Service)
                .Include(a => a.StaffProfile).ThenInclude(profile => profile.BusinessMember).ThenInclude(member => member.User)
                .Include(a => a.Customer)
                .Where(a => a.StaffProfile.BusinessMember.UserId == userId.Value);

            if (status.HasValue && Enum.IsDefined(typeof(AppointmentStatus), status.Value))
            {
                var statusEnum = (AppointmentStatus)status.Value;
                query = query.Where(a => a.Status == statusEnum);
            }

            var appointments = await query
                .OrderByDescending(a => a.StartAt)
                .Skip(safeSkip)
                .Take(safeTake)
                .ToListAsync(cancellationToken);

            var reviewedIds = await GetReviewedAppointmentIdsAsync(appointments, cancellationToken);
            var dtos = appointments.Select(a =>
            {
                var dto = MapToDto(a);
                dto.HasReview = reviewedIds.Contains(a.Id);
                return dto;
            }).ToList();

            return DataResult<IReadOnlyList<AppointmentResponseDto>>.Ok(dtos);
        }

        private async Task<HashSet<Guid>> GetReviewedAppointmentIdsAsync(
            IReadOnlyList<Appointment> appointments,
            CancellationToken cancellationToken)
        {
            var completedIds = appointments
                .Where(a => a.Status == AppointmentStatus.Completed)
                .Select(a => a.Id)
                .ToList();

            if (completedIds.Count == 0)
            {
                return new HashSet<Guid>();
            }

            var reviewed = await _unitOfWork.Repository<Entities.Reviews.Review>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(r => completedIds.Contains(r.AppointmentId))
                .Select(r => r.AppointmentId)
                .ToListAsync(cancellationToken);

            return new HashSet<Guid>(reviewed);
        }

        public async Task<IResult> UpdateMyWorkAppointmentStatusAsync(UpdateAppointmentStatusRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue) return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            if (!Enum.IsDefined(typeof(AppointmentStatus), request.NewStatus)) return Result.Fail("Geçersiz randevu durumu.", 400);

            var appointmentRepo = _unitOfWork.Repository<Appointment>();
            var appointment = await appointmentRepo.Query()
                .Include(a => a.StaffProfile).ThenInclude(profile => profile.BusinessMember)
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId && a.StaffProfile.BusinessMember.UserId == userId.Value, cancellationToken);
            if (appointment == null) return Result.Fail("Bu randevu çalışan hesabınızda bulunamadı.", 404);

            return await ApplyStatusTransitionAsync(
                appointment,
                (AppointmentStatus)request.NewStatus,
                userId.Value,
                request.Note,
                "Çalışan tarafından iptal edildi.",
                cancellationToken);
        }

        public async Task<IDataResult<IReadOnlyList<AppointmentResponseDto>>> GetBranchAppointmentsAsync(Guid branchId, DateOnly? date = null, DateOnly? startDate = null, DateOnly? endDate = null, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<IReadOnlyList<AppointmentResponseDto>>.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            // Cross-tenant IDOR koruması: yalnızca kendi işletmesinin şubesini sorgulayabilir
            var branchOwned = await _unitOfWork.Repository<Branch>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .AnyAsync(b => b.Id == branchId && b.BusinessId == businessId.Value, cancellationToken);

            if (!branchOwned)
            {
                return DataResult<IReadOnlyList<AppointmentResponseDto>>.Fail("Bu şubenin randevularına erişim yetkiniz bulunmamaktadır.", 403);
            }

            // Tarih aralığı hesapla (asla tüm veritabanı geçmişini limitsiz çekmez)
            DateTimeOffset startUtc;
            DateTimeOffset endUtc;
            var tzOffset = TimeSpan.FromHours(3);

            if (date.HasValue)
            {
                startUtc = new DateTimeOffset(date.Value.ToDateTime(TimeOnly.MinValue), tzOffset).ToUniversalTime();
                endUtc = new DateTimeOffset(date.Value.ToDateTime(TimeOnly.MaxValue), tzOffset).ToUniversalTime();
            }
            else if (startDate.HasValue || endDate.HasValue)
            {
                var rangeStart = startDate ?? endDate!.Value.AddDays(-7);
                var rangeEnd = endDate ?? startDate!.Value.AddDays(7);
                if ((rangeEnd.DayNumber - rangeStart.DayNumber) > 62)
                {
                    rangeEnd = rangeStart.AddDays(62);
                }

                startUtc = new DateTimeOffset(rangeStart.ToDateTime(TimeOnly.MinValue), tzOffset).ToUniversalTime();
                endUtc = new DateTimeOffset(rangeEnd.ToDateTime(TimeOnly.MaxValue), tzOffset).ToUniversalTime();
            }
            else
            {
                var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.ToOffset(tzOffset).DateTime);
                startUtc = new DateTimeOffset(today.AddDays(-30).ToDateTime(TimeOnly.MinValue), tzOffset).ToUniversalTime();
                endUtc = new DateTimeOffset(today.AddDays(60).ToDateTime(TimeOnly.MaxValue), tzOffset).ToUniversalTime();
            }

            var appointments = await _unitOfWork.Repository<Appointment>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Include(a => a.Branch)
                .Include(a => a.Service)
                .Include(a => a.StaffProfile).ThenInclude(sp => sp.BusinessMember).ThenInclude(bm => bm.User)
                .Include(a => a.Customer)
                .Where(a => a.BranchId == branchId &&
                            a.BusinessId == businessId.Value &&
                            a.StartAt >= startUtc &&
                            a.StartAt <= endUtc)
                .OrderBy(a => a.StartAt)
                .ToListAsync(cancellationToken);

            return DataResult<IReadOnlyList<AppointmentResponseDto>>.Ok(appointments.Select(MapToDto).ToList());
        }
    }
}
