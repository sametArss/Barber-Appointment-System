using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
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

        public ScheduleManager(IUnitOfWork unitOfWork, ICurrentTenantService tenantService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
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
            var workingHours = await _unitOfWork.Repository<BranchWorkingHour>().Query()
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
            var exceptions = await _unitOfWork.Repository<BranchScheduleException>().Query()
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

        public async Task<IResult> SetStaffWorkingHoursAsync(SetStaffWorkingHoursRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var staff = await _unitOfWork.Repository<StaffProfile>().Query()
                .Include(sp => sp.BusinessMember)
                .FirstOrDefaultAsync(
                    sp => sp.Id == request.StaffProfileId && sp.BusinessMember.BusinessId == businessId.Value,
                    cancellationToken);

            if (staff == null)
            {
                return Result.Fail("Çalışan kaydı bulunamadı veya işletmenize ait değil.", 404);
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
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var staff = await _unitOfWork.Repository<StaffProfile>().Query()
                .Include(sp => sp.BusinessMember)
                .FirstOrDefaultAsync(
                    sp => sp.Id == request.StaffProfileId && sp.BusinessMember.BusinessId == businessId.Value,
                    cancellationToken);

            if (staff == null)
            {
                return Result.Fail("Çalışan bulunamadı veya işletmenize ait değil.", 404);
            }

            if (request.StartAt >= request.EndAt)
            {
                return Result.Fail("İzin başlangıç tarihi bitiş tarihinden önce olmalıdır.", 400);
            }

            var exception = new StaffScheduleException
            {
                Id = Guid.NewGuid(),
                StaffProfileId = request.StaffProfileId,
                BranchId = request.BranchId,
                StartAt = request.StartAt.ToUniversalTime(),
                EndAt = request.EndAt.ToUniversalTime(),
                Reason = request.Reason?.Trim()
            };

            await _unitOfWork.Repository<StaffScheduleException>().AddAsync(exception, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Personel izin/özel durum kaydı başarıyla eklendi.");
        }

        public async Task<IDataResult<IReadOnlyList<ScheduleExceptionResponseDto>>> GetStaffExceptionsAsync(Guid staffProfileId, Guid branchId, CancellationToken cancellationToken = default)
        {
            var exceptions = await _unitOfWork.Repository<StaffScheduleException>().Query()
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
    }
}