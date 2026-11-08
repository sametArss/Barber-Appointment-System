using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Appointments;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Customers;
using BarberBooking.Entities.Identity;
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

        public AppointmentManager(IUnitOfWork unitOfWork, ICurrentTenantService tenantService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
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
            var branchService = await _unitOfWork.Repository<BranchService>().Query()
                .Include(bs => bs.Service)
                .FirstOrDefaultAsync(bs => bs.BranchId == query.BranchId && bs.ServiceId == query.ServiceId && bs.IsActive, cancellationToken);

            if (branchService == null || !branchService.Service.IsActive)
            {
                return DataResult<IReadOnlyList<AvailableSlotResponseDto>>.Fail("Hizmet bu şubede aktif değil.", 404);
            }

            int durationMinutes = branchService.DurationOverride ?? branchService.Service.DurationMinutes;
            if (durationMinutes <= 0) durationMinutes = 30;

            var dayOfWeek = query.Date.DayOfWeek;

            // 1. Personel o gün çalışıyor mu?
            var staffWorkingHour = await _unitOfWork.Repository<StaffWorkingHour>().Query()
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

            var staffLeave = await _unitOfWork.Repository<StaffScheduleException>().AnyAsync(
                e => e.StaffProfileId == query.StaffProfileId && e.BranchId == query.BranchId && e.StartAt < dayEndUtc && e.EndAt > dayStartUtc,
                cancellationToken);

            if (staffLeave)
            {
                return DataResult<IReadOnlyList<AvailableSlotResponseDto>>.Ok(new List<AvailableSlotResponseDto>(), "Personel seçilen tarihte izinlidir.");
            }

            // 3. Mevcut Randevular
            var activeAppointments = await _unitOfWork.Repository<Appointment>().Query()
                .Where(a => a.StaffProfileId == query.StaffProfileId &&
                            a.BranchId == query.BranchId &&
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

            var priceSnapshot = branchService.PriceOverride ?? branchService.Service.BasePrice;
            var durationSnapshot = branchService.DurationOverride ?? branchService.Service.DurationMinutes;
            if (durationSnapshot <= 0) durationSnapshot = 30;

            var startUtc = request.StartAt.ToUniversalTime();
            var endUtc = startUtc.AddMinutes(durationSnapshot);

            if (startUtc <= DateTimeOffset.UtcNow)
            {
                return DataResult<AppointmentResponseDto>.Fail("Geçmiş zamana randevu alınamaz.", 400);
            }

            await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                // Çift rezervasyon kontrolü (Concurrency & Conflict Prevention)
                var hasConflict = await _unitOfWork.Repository<Appointment>().AnyAsync(
                    a => a.StaffProfileId == request.StaffProfileId &&
                         a.BranchId == request.BranchId &&
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
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
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

            if (appointment.Status == AppointmentStatus.Cancelled)
            {
                return Result.Fail("Randevu zaten iptal edilmiştir.", 400);
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

            var newStatusEnum = (AppointmentStatus)request.NewStatus;
            var oldStatus = appointment.Status;

            appointment.Status = newStatusEnum;
            appointmentRepo.Update(appointment);

            var history = new AppointmentStatusHistory
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointment.Id,
                OldStatus = oldStatus,
                NewStatus = newStatusEnum,
                ChangedByUserId = userId,
                Note = request.Note?.Trim()
            };

            await _unitOfWork.Repository<AppointmentStatusHistory>().AddAsync(history, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Randevu durumu güncellendi.");
        }

        public async Task<IDataResult<IReadOnlyList<AppointmentResponseDto>>> GetMyAppointmentsAsync(CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<IReadOnlyList<AppointmentResponseDto>>.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var appointments = await _unitOfWork.Repository<Appointment>().Query()
                .Include(a => a.Branch)
                .Include(a => a.Service)
                .Include(a => a.StaffProfile).ThenInclude(sp => sp.BusinessMember).ThenInclude(bm => bm.User)
                .Include(a => a.Customer)
                .Where(a => a.CustomerUserId == userId.Value)
                .OrderByDescending(a => a.StartAt)
                .ToListAsync(cancellationToken);

            var response = appointments.Select(a => new AppointmentResponseDto
            {
                Id = a.Id,
                CustomerUserId = a.CustomerUserId,
                CustomerFullName = $"{a.Customer.FirstName} {a.Customer.LastName}",
                CustomerPhoneNumber = a.Customer.PhoneNumber,
                BusinessId = a.BusinessId,
                BranchId = a.BranchId,
                BranchName = a.Branch.Name,
                StaffProfileId = a.StaffProfileId,
                StaffFullName = $"{a.StaffProfile.BusinessMember.User.FirstName} {a.StaffProfile.BusinessMember.User.LastName}",
                ServiceId = a.ServiceId,
                ServiceName = a.Service.Name,
                StartAt = a.StartAt,
                EndAt = a.EndAt,
                PriceSnapshot = a.PriceSnapshot,
                DurationSnapshot = a.DurationSnapshot,
                Status = (int)a.Status,
                StatusName = a.Status.ToString(),
                CancellationReason = a.CancellationReason
            }).ToList();

            return DataResult<IReadOnlyList<AppointmentResponseDto>>.Ok(response);
        }

        public async Task<IDataResult<IReadOnlyList<AppointmentResponseDto>>> GetBranchAppointmentsAsync(Guid branchId, DateOnly? date = null, CancellationToken cancellationToken = default)
        {
            var query = _unitOfWork.Repository<Appointment>().Query()
                .Include(a => a.Branch)
                .Include(a => a.Service)
                .Include(a => a.StaffProfile).ThenInclude(sp => sp.BusinessMember).ThenInclude(bm => bm.User)
                .Include(a => a.Customer)
                .Where(a => a.BranchId == branchId);

            if (date.HasValue)
            {
                var dayStart = date.Value.ToDateTime(TimeOnly.MinValue);
                var dayEnd = date.Value.ToDateTime(TimeOnly.MaxValue);
                var startUtc = new DateTimeOffset(dayStart, TimeSpan.Zero);
                var endUtc = new DateTimeOffset(dayEnd, TimeSpan.Zero);

                query = query.Where(a => a.StartAt >= startUtc && a.StartAt <= endUtc);
            }

            var appointments = await query.OrderBy(a => a.StartAt).ToListAsync(cancellationToken);

            var response = appointments.Select(a => new AppointmentResponseDto
            {
                Id = a.Id,
                CustomerUserId = a.CustomerUserId,
                CustomerFullName = $"{a.Customer.FirstName} {a.Customer.LastName}",
                CustomerPhoneNumber = a.Customer.PhoneNumber,
                BusinessId = a.BusinessId,
                BranchId = a.BranchId,
                BranchName = a.Branch.Name,
                StaffProfileId = a.StaffProfileId,
                StaffFullName = $"{a.StaffProfile.BusinessMember.User.FirstName} {a.StaffProfile.BusinessMember.User.LastName}",
                ServiceId = a.ServiceId,
                ServiceName = a.Service.Name,
                StartAt = a.StartAt,
                EndAt = a.EndAt,
                PriceSnapshot = a.PriceSnapshot,
                DurationSnapshot = a.DurationSnapshot,
                Status = (int)a.Status,
                StatusName = a.Status.ToString(),
                CancellationReason = a.CancellationReason
            }).ToList();

            return DataResult<IReadOnlyList<AppointmentResponseDto>>.Ok(response);
        }
    }
}