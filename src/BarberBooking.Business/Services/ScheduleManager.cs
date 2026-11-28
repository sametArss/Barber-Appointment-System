using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Appointments;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Notifications;
using BarberBooking.Entities.Scheduling;
using BarberBooking.Shared.DTOs.Scheduling;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.Business.Services
{
    public class ScheduleManager : IScheduleService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;
        private readonly INotificationService _notificationService;

        public ScheduleManager(
            IUnitOfWork unitOfWork,
            ICurrentTenantService tenantService,
            INotificationService notificationService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
            _notificationService = notificationService;
        }

        public async Task<IResult> SetBranchWorkingHoursAsync(SetBranchWorkingHoursRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var branch = await _unitOfWork.Repository<Branch>().FirstOrDefaultAsync(
                b => b.Id == request.BranchId && b.BusinessId == businessId.Value,
                cancellationToken);

            if (branch == null)
            {
                return Result.Fail("Şube bulunamadı veya işletmenize ait değil.", 404);
            }

            // Saat ve mola doğrulamaları
            foreach (var item in request.WorkingHours)
            {
                if (item.StartTime >= item.EndTime)
                {
                    return Result.Fail($"{item.DayOfWeek} günü için başlangıç saati bitiş saatinden önce olmalıdır.", 400);
                }

                foreach (var b in item.Breaks)
                {
                    if (b.StartTime >= b.EndTime)
                    {
                        return Result.Fail("Mola başlangıç saati bitiş saatinden önce olmalıdır.", 400);
                    }

                    if (b.StartTime < item.StartTime || b.EndTime > item.EndTime)
                    {
                        return Result.Fail("Mola saatleri mesai saatleri aralığında olmalıdır.", 400);
                    }
                }
            }

            await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var workingHourRepo = _unitOfWork.Repository<BranchWorkingHour>();
                var existingHours = await workingHourRepo.Query()
                    .Include(wh => wh.Breaks)
                    .Where(wh => wh.BranchId == request.BranchId)
                    .ToListAsync(cancellationToken);

                var breakRepo = _unitOfWork.Repository<BranchWorkingHourBreak>();
                foreach (var eh in existingHours)
                {
                    if (eh.Breaks.Any())
                    {
                        breakRepo.RemoveRange(eh.Breaks);
                    }
                }
                workingHourRepo.RemoveRange(existingHours);

                foreach (var item in request.WorkingHours)
                {
                    var newHour = new BranchWorkingHour
                    {
                        Id = Guid.NewGuid(),
                        BranchId = request.BranchId,
                        DayOfWeek = item.DayOfWeek,
                        StartTime = item.StartTime,
                        EndTime = item.EndTime
                    };

                    await workingHourRepo.AddAsync(newHour, cancellationToken);

                    foreach (var b in item.Breaks)
                    {
                        await breakRepo.AddAsync(new BranchWorkingHourBreak
                        {
                            Id = Guid.NewGuid(),
                            BranchWorkingHourId = newHour.Id,
                            StartTime = b.StartTime,
                            EndTime = b.EndTime
                        }, cancellationToken);
                    }
                }

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
                return Result.Ok("Şube çalışma saatleri başarıyla güncellendi.");
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }

        public async Task<IDataResult<IReadOnlyList<WorkingHourResponseDto>>> GetBranchWorkingHoursAsync(Guid branchId, CancellationToken cancellationToken = default)
        {
            var workingHours = await _unitOfWork.Repository<BranchWorkingHour>().QueryAsNoTracking()
                .Include(wh => wh.Breaks)
                .Where(wh => wh.BranchId == branchId)
                .OrderBy(wh => wh.DayOfWeek)
                .ToListAsync(cancellationToken);

            var response = workingHours.Select(wh => new WorkingHourResponseDto
            {
                Id = wh.Id,
                DayOfWeek = wh.DayOfWeek,
                StartTime = wh.StartTime,
                EndTime = wh.EndTime,
                Breaks = wh.Breaks.Select(b => new WorkingHourBreakDto
                {
                    StartTime = b.StartTime,
                    EndTime = b.EndTime
                }).ToList()
            }).ToList();

            return DataResult<IReadOnlyList<WorkingHourResponseDto>>.Ok(response);
        }

        public async Task<IResult> AddBranchExceptionAsync(CreateBranchExceptionRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var branch = await _unitOfWork.Repository<Branch>().FirstOrDefaultAsync(
                b => b.Id == request.BranchId && b.BusinessId == businessId.Value,
                cancellationToken);

            if (branch == null)
            {
                return Result.Fail("Şube bulunamadı veya işletmenize ait değil.", 404);
            }

            if (request.StartAt >= request.EndAt)
            {
                return Result.Fail("İstisna başlangıç tarihi bitiş tarihinden önce olmalıdır.", 400);
            }

            if (!Enum.IsDefined(typeof(BranchScheduleExceptionType), request.Type))
            {
                return Result.Fail("Geçersiz istisna türü.", 400);
            }

            var exception = new BranchScheduleException
            {
                Id = Guid.NewGuid(),
                BranchId = request.BranchId,
                Type = (BranchScheduleExceptionType)request.Type,
                StartAt = request.StartAt.ToUniversalTime(),
                EndAt = request.EndAt.ToUniversalTime(),
                Reason = request.Reason?.Trim()
            };

            await _unitOfWork.Repository<BranchScheduleException>().AddAsync(exception, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Şube özel çalışma/tatil istisnası başarıyla eklendi.");
        }

        public async Task<IDataResult<IReadOnlyList<ScheduleExceptionResponseDto>>> GetBranchExceptionsAsync(Guid branchId, CancellationToken cancellationToken = default)
        {
            var exceptions = await _unitOfWork.Repository<BranchScheduleException>().QueryAsNoTracking()
                .Where(e => e.BranchId == branchId && e.EndAt >= DateTimeOffset.UtcNow)
                .OrderBy(e => e.StartAt)
                .ToListAsync(cancellationToken);

            var response = exceptions.Select(e => new ScheduleExceptionResponseDto
            {
                Id = e.Id,
                StartAt = e.StartAt,
                EndAt = e.EndAt,
                Reason = e.Reason,
                TypeName = e.Type.ToString()
            }).ToList();

            return DataResult<IReadOnlyList<ScheduleExceptionResponseDto>>.Ok(response);
        }

        private async Task<(StaffProfile? Staff, string? Error, int StatusCode)> AuthorizeStaffScheduleAccessAsync(
            Guid staffProfileId,
            Guid branchId,
            CancellationToken cancellationToken)
        {
            var userId = _tenantService.UserId;
            var businessId = _tenantService.BusinessId;
            if (!userId.HasValue)
            {
                return (null, "Oturum açmanız gerekmektedir.", 401);
            }

            var staff = await _unitOfWork.Repository<StaffProfile>().Query()
                .IgnoreQueryFilters()
                .Include(sp => sp.BusinessMember)
                .Include(sp => sp.BranchAssignments)
                .FirstOrDefaultAsync(sp => sp.Id == staffProfileId, cancellationToken);

            if (staff == null)
            {
                return (null, "Çalışan kaydı bulunamadı.", 404);
            }

            var isSelf = staff.BusinessMember.UserId == userId.Value && staff.BusinessMember.IsActive;
            var isBusinessManager = businessId.HasValue && staff.BusinessMember.BusinessId == businessId.Value;

            if (!isSelf && !isBusinessManager)
            {
                return (null, "Bu personelin çalışma saatlerini düzenleme yetkiniz yok.", 403);
            }

            if (branchId != Guid.Empty && !staff.BranchAssignments.Any(ba => ba.BranchId == branchId))
            {
                return (null, "Çalışan seçilen şubeye atanmamış.", 400);
            }

            return (staff, null, 200);
        }

        public async Task<IResult> SetStaffWorkingHoursAsync(SetStaffWorkingHoursRequestDto request, CancellationToken cancellationToken = default)
        {
            var (staff, error, statusCode) = await AuthorizeStaffScheduleAccessAsync(request.StaffProfileId, request.BranchId, cancellationToken);
            if (staff == null)
            {
                return Result.Fail(error!, statusCode);
            }

            // Saat ve mola doğrulamaları
            foreach (var item in request.WorkingHours)
            {
                if (item.StartTime >= item.EndTime)
                {
                    return Result.Fail($"{item.DayOfWeek} günü için personelin başlangıç saati bitiş saatinden önce olmalıdır.", 400);
                }

                foreach (var b in item.Breaks)
                {
                    if (b.StartTime >= b.EndTime)
                    {
                        return Result.Fail("Mola başlangıç saati bitiş saatinden önce olmalıdır.", 400);
                    }

                    if (b.StartTime < item.StartTime || b.EndTime > item.EndTime)
                    {
                        return Result.Fail("Mola saatleri personelin mesai saatleri aralığında olmalıdır.", 400);
                    }
                }
            }

            await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var workingHourRepo = _unitOfWork.Repository<StaffWorkingHour>();
                var existingHours = await workingHourRepo.Query()
                    .Include(wh => wh.Breaks)
                    .Where(wh => wh.StaffProfileId == request.StaffProfileId && wh.BranchId == request.BranchId)
                    .ToListAsync(cancellationToken);

                var breakRepo = _unitOfWork.Repository<StaffWorkingHourBreak>();
                foreach (var eh in existingHours)
                {
                    if (eh.Breaks.Any())
                    {
                        breakRepo.RemoveRange(eh.Breaks);
                    }
                }
                workingHourRepo.RemoveRange(existingHours);

                foreach (var item in request.WorkingHours)
                {
                    var newHour = new StaffWorkingHour
                    {
                        Id = Guid.NewGuid(),
                        StaffProfileId = request.StaffProfileId,
                        BranchId = request.BranchId,
                        DayOfWeek = item.DayOfWeek,
                        StartTime = item.StartTime,
                        EndTime = item.EndTime
                    };

                    await workingHourRepo.AddAsync(newHour, cancellationToken);

                    foreach (var b in item.Breaks)
                    {
                        await breakRepo.AddAsync(new StaffWorkingHourBreak
                        {
                            Id = Guid.NewGuid(),
                            StaffWorkingHourId = newHour.Id,
                            StartTime = b.StartTime,
                            EndTime = b.EndTime
                        }, cancellationToken);
                    }
                }

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
                return Result.Ok("Personel çalışma saatleri başarıyla güncellendi.");
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }

        public async Task<IDataResult<IReadOnlyList<WorkingHourResponseDto>>> GetStaffWorkingHoursAsync(Guid staffProfileId, Guid branchId, CancellationToken cancellationToken = default)
        {
            var workingHours = await _unitOfWork.Repository<StaffWorkingHour>().Query()
                .Include(wh => wh.Breaks)
                .Where(wh => wh.StaffProfileId == staffProfileId && wh.BranchId == branchId)
                .OrderBy(wh => wh.DayOfWeek)
                .ToListAsync(cancellationToken);

            var response = workingHours.Select(wh => new WorkingHourResponseDto
            {
                Id = wh.Id,
                DayOfWeek = wh.DayOfWeek,
                StartTime = wh.StartTime,
                EndTime = wh.EndTime,
                Breaks = wh.Breaks.Select(b => new WorkingHourBreakDto
                {
                    StartTime = b.StartTime,
                    EndTime = b.EndTime
                }).ToList()
            }).ToList();

            return DataResult<IReadOnlyList<WorkingHourResponseDto>>.Ok(response);
        }

        public async Task<IResult> AddStaffExceptionAsync(CreateStaffExceptionRequestDto request, CancellationToken cancellationToken = default)
        {
            var (staff, error, statusCode) = await AuthorizeStaffScheduleAccessAsync(request.StaffProfileId, request.BranchId, cancellationToken);
            if (staff == null)
            {
                return Result.Fail(error!, statusCode);
            }

            if (request.StartAt >= request.EndAt)
            {
                return Result.Fail("Başlangıç saati bitiş saatinden önce olmalıdır.", 400);
            }

            var startUtc = request.StartAt.ToUniversalTime();
            var endUtc = request.EndAt.ToUniversalTime();

            var conflictingAppointments = await _unitOfWork.Repository<Appointment>().Query()
                .IgnoreQueryFilters()
                .Include(a => a.Customer)
                .Include(a => a.Branch)
                .Where(a => a.StaffProfileId == request.StaffProfileId &&
                            a.BranchId == request.BranchId &&
                            a.StartAt < endUtc &&
                            a.EndAt > startUtc &&
                            (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed))
                .OrderBy(a => a.StartAt)
                .ToListAsync(cancellationToken);

            if (conflictingAppointments.Count > 0 && !request.CancelConflictingAppointments)
            {
                var previewList = string.Join(", ", conflictingAppointments.Take(3).Select(a =>
                    $"{a.StartAt.ToOffset(TimeSpan.FromHours(3)):HH:mm} {a.Customer.FirstName} {a.Customer.LastName}".Trim()));
                var suffix = conflictingAppointments.Count > 3 ? $" ve +{conflictingAppointments.Count - 3} randevu daha" : string.Empty;
                return Result.Fail(
                    $"Bu saat aralığında {conflictingAppointments.Count} adet aktif randevu bulunuyor ({previewList}{suffix}). Çakışan randevuları iptal ederek bu saati kapatmak ister misiniz?",
                    409);
            }

            var now = DateTimeOffset.UtcNow;
            var cancelReason = string.IsNullOrWhiteSpace(request.Reason)
                ? "Personel saat aralığını kapattığı için randevu iptal edildi."
                : $"Personel kapalı saat ekledi: {request.Reason.Trim()}";

            if (conflictingAppointments.Count > 0)
            {
                var appointmentRepo = _unitOfWork.Repository<Appointment>();
                var historyRepo = _unitOfWork.Repository<AppointmentStatusHistory>();

                foreach (var appt in conflictingAppointments)
                {
                    var oldStatus = appt.Status;
                    appt.Status = AppointmentStatus.Cancelled;
                    appt.CancelledAt = now;
                    appt.CancelledByUserId = _tenantService.UserId;
                    appt.CancellationReason = cancelReason;
                    appointmentRepo.Update(appt);

                    await historyRepo.AddAsync(new AppointmentStatusHistory
                    {
                        Id = Guid.NewGuid(),
                        AppointmentId = appt.Id,
                        OldStatus = oldStatus,
                        NewStatus = AppointmentStatus.Cancelled,
                        ChangedByUserId = _tenantService.UserId,
                        Note = cancelReason
                    }, cancellationToken);
                }
            }

            var exception = new StaffScheduleException
            {
                Id = Guid.NewGuid(),
                StaffProfileId = request.StaffProfileId,
                BranchId = request.BranchId,
                StartAt = startUtc,
                EndAt = endUtc,
                Reason = request.Reason?.Trim()
            };

            await _unitOfWork.Repository<StaffScheduleException>().AddAsync(exception, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            foreach (var appt in conflictingAppointments)
            {
                try
                {
                    var apptDateStr = appt.StartAt.ToOffset(TimeSpan.FromHours(3)).ToString("dd.MM.yyyy HH:mm");
                    await _notificationService.SendNotificationAsync(
                        appt.CustomerUserId,
                        NotificationType.AppointmentCancelled,
                        "Randevunuz İptal Edildi",
                        $"{appt.Branch?.Name ?? "Salon"} şubesindeki {apptDateStr} tarihli randevunuz personel program değişikliği nedeniyle iptal edildi. ({cancelReason})",
                        appt.Id,
                        cancellationToken);
                }
                catch
                {
                    // Bildirim hatası akışı kesmemeli
                }
            }

            return Result.Ok(
                conflictingAppointments.Count > 0
                    ? $"Saat aralığı kapatıldı ve çakışan {conflictingAppointments.Count} randevu iptal edilerek müşterilere bildirim gönderildi."
                    : "Özel saat kapatma / izin kaydı başarıyla eklendi.");
        }

        public async Task<IDataResult<IReadOnlyList<ScheduleExceptionResponseDto>>> GetStaffExceptionsAsync(Guid staffProfileId, Guid branchId, CancellationToken cancellationToken = default)
        {
            var exceptions = await _unitOfWork.Repository<StaffScheduleException>().QueryAsNoTracking()
                .Where(e => e.StaffProfileId == staffProfileId && e.BranchId == branchId && e.EndAt >= DateTimeOffset.UtcNow)
                .OrderBy(e => e.StartAt)
                .ToListAsync(cancellationToken);

            var response = exceptions.Select(e => new ScheduleExceptionResponseDto
            {
                Id = e.Id,
                StartAt = e.StartAt,
                EndAt = e.EndAt,
                Reason = e.Reason,
                TypeName = "LeaveOrException"
            }).ToList();

            return DataResult<IReadOnlyList<ScheduleExceptionResponseDto>>.Ok(response);
        }

        public async Task<IResult> DeleteStaffExceptionAsync(Guid exceptionId, CancellationToken cancellationToken = default)
        {
            var exceptionRepo = _unitOfWork.Repository<StaffScheduleException>();
            var exception = await exceptionRepo.FirstOrDefaultAsync(e => e.Id == exceptionId, cancellationToken);
            if (exception == null)
            {
                return Result.Fail("Kayıt bulunamadı.", 404);
            }

            var (staff, error, statusCode) = await AuthorizeStaffScheduleAccessAsync(exception.StaffProfileId, Guid.Empty, cancellationToken);
            if (staff == null)
            {
                return Result.Fail(error!, statusCode);
            }

            exceptionRepo.Remove(exception);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Özel saat kapatma / izin kaydı kaldırıldı.");
        }
    }
}