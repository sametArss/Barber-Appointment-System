using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Services;
using BarberBooking.Shared.DTOs.Services;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.Business.Services
{
    public class ServiceManager : IServiceManagementService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;

        public ServiceManager(IUnitOfWork unitOfWork, ICurrentTenantService tenantService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
        }

        public async Task<IDataResult<ServiceResponseDto>> CreateServiceAsync(CreateServiceRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<ServiceResponseDto>.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            if (request.DurationMinutes <= 0)
            {
                return DataResult<ServiceResponseDto>.Fail("Hizmet süresi 0'dan büyük olmalıdır.", 400);
            }

            if (request.BasePrice < 0)
            {
                return DataResult<ServiceResponseDto>.Fail("Taban fiyat negatif olamaz.", 400);
            }

            var service = new Service
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId.Value,
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                BasePrice = request.BasePrice,
                DurationMinutes = request.DurationMinutes,
                ImageUrl = request.ImageUrl?.Trim(),
                IsActive = true
            };

            await _unitOfWork.Repository<Service>().AddAsync(service, cancellationToken);

            var assignedBranchIds = new List<Guid>();
            var assignedBranchNames = new List<string>();
            var branchOverrides = new List<BranchServiceOverrideDto>();
            var overrideMap = (request.BranchOverrides ?? new List<BranchServiceOverrideInputDto>())
                .GroupBy(o => o.BranchId)
                .ToDictionary(g => g.Key, g => g.Last());

            if (request.AssignToBranchIds != null && request.AssignToBranchIds.Count > 0)
            {
                var branchRepo = _unitOfWork.Repository<Branch>();
                var validBranches = await branchRepo.Query()
                    .Where(b => b.BusinessId == businessId.Value && request.AssignToBranchIds.Contains(b.Id))
                    .Select(b => new { b.Id, b.Name })
                    .ToListAsync(cancellationToken);

                var branchServiceRepo = _unitOfWork.Repository<BranchService>();
                foreach (var branch in validBranches)
                {
                    overrideMap.TryGetValue(branch.Id, out var ov);
                    var priceOv = ov?.PriceOverride is >= 0 ? ov.PriceOverride : null;
                    var durOv = ov?.DurationOverride is > 0 ? ov.DurationOverride : null;

                    await branchServiceRepo.AddAsync(new BranchService
                    {
                        Id = Guid.NewGuid(),
                        BranchId = branch.Id,
                        ServiceId = service.Id,
                        PriceOverride = priceOv,
                        DurationOverride = durOv,
                        IsActive = true
                    }, cancellationToken);
                    assignedBranchIds.Add(branch.Id);
                    assignedBranchNames.Add(branch.Name);
                    branchOverrides.Add(new BranchServiceOverrideDto
                    {
                        BranchId = branch.Id,
                        BranchName = branch.Name,
                        PriceOverride = priceOv,
                        DurationOverride = durOv
                    });
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var response = new ServiceResponseDto
            {
                Id = service.Id,
                BusinessId = service.BusinessId,
                Name = service.Name,
                Description = service.Description,
                BasePrice = service.BasePrice,
                DurationMinutes = service.DurationMinutes,
                ImageUrl = service.ImageUrl,
                IsActive = service.IsActive,
                AssignedBranchIds = assignedBranchIds,
                AssignedBranchNames = assignedBranchNames,
                BranchOverrides = branchOverrides
            };

            return DataResult<ServiceResponseDto>.Ok(response, "Hizmet başarıyla eklendi.");
        }

        public async Task<IDataResult<ServiceResponseDto>> UpdateServiceAsync(UpdateServiceRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<ServiceResponseDto>.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            if (request.DurationMinutes <= 0)
            {
                return DataResult<ServiceResponseDto>.Fail("Hizmet süresi 0'dan büyük olmalıdır.", 400);
            }

            if (request.BasePrice < 0)
            {
                return DataResult<ServiceResponseDto>.Fail("Taban fiyat negatif olamaz.", 400);
            }

            var serviceRepo = _unitOfWork.Repository<Service>();
            var service = await serviceRepo.FirstOrDefaultAsync(
                s => s.Id == request.Id && s.BusinessId == businessId.Value,
                cancellationToken);

            if (service == null)
            {
                return DataResult<ServiceResponseDto>.Fail("Hizmet bulunamadı.", 404);
            }

            service.Name = request.Name.Trim();
            service.Description = request.Description?.Trim();
            service.BasePrice = request.BasePrice;
            service.DurationMinutes = request.DurationMinutes;
            service.ImageUrl = request.ImageUrl?.Trim();
            service.IsActive = request.IsActive;

            serviceRepo.Update(service);

            var branchServiceRepo = _unitOfWork.Repository<BranchService>();
            var existingBranchServices = await branchServiceRepo.Query()
                .Include(bs => bs.Branch)
                .Where(bs => bs.ServiceId == service.Id)
                .ToListAsync(cancellationToken);

            var assignedBranchIds = new List<Guid>();
            var assignedBranchNames = new List<string>();
            var branchOverrides = new List<BranchServiceOverrideDto>();
            var overrideMap = (request.BranchOverrides ?? new List<BranchServiceOverrideInputDto>())
                .GroupBy(o => o.BranchId)
                .ToDictionary(g => g.Key, g => g.Last());

            if (request.AssignToBranchIds != null)
            {
                var requestedIds = request.AssignToBranchIds.Distinct().ToHashSet();
                var businessBranches = await _unitOfWork.Repository<Branch>().Query()
                    .Where(b => b.BusinessId == businessId.Value)
                    .Select(b => new { b.Id, b.Name })
                    .ToListAsync(cancellationToken);

                var validBranchMap = businessBranches
                    .Where(b => requestedIds.Contains(b.Id))
                    .ToDictionary(b => b.Id, b => b.Name);

                var existingMap = existingBranchServices.ToDictionary(bs => bs.BranchId);

                foreach (var existing in existingBranchServices)
                {
                    var shouldBeActive = validBranchMap.ContainsKey(existing.BranchId);
                    var changed = existing.IsActive != shouldBeActive;
                    existing.IsActive = shouldBeActive;

                    if (shouldBeActive && request.BranchOverrides != null)
                    {
                        overrideMap.TryGetValue(existing.BranchId, out var ov);
                        var nextPrice = ov?.PriceOverride is >= 0 ? ov.PriceOverride : null;
                        var nextDur = ov?.DurationOverride is > 0 ? ov.DurationOverride : null;
                        if (existing.PriceOverride != nextPrice || existing.DurationOverride != nextDur)
                        {
                            existing.PriceOverride = nextPrice;
                            existing.DurationOverride = nextDur;
                            changed = true;
                        }
                    }

                    if (changed)
                    {
                        branchServiceRepo.Update(existing);
                    }
                }

                foreach (var kvp in validBranchMap)
                {
                    decimal? finalPriceOv;
                    int? finalDurOv;

                    if (!existingMap.TryGetValue(kvp.Key, out var existingRecord))
                    {
                        overrideMap.TryGetValue(kvp.Key, out var ov);
                        finalPriceOv = ov?.PriceOverride is >= 0 ? ov.PriceOverride : null;
                        finalDurOv = ov?.DurationOverride is > 0 ? ov.DurationOverride : null;

                        await branchServiceRepo.AddAsync(new BranchService
                        {
                            Id = Guid.NewGuid(),
                            BranchId = kvp.Key,
                            ServiceId = service.Id,
                            PriceOverride = finalPriceOv,
                            DurationOverride = finalDurOv,
                            IsActive = true
                        }, cancellationToken);
                    }
                    else
                    {
                        finalPriceOv = existingRecord.PriceOverride;
                        finalDurOv = existingRecord.DurationOverride;
                    }

                    assignedBranchIds.Add(kvp.Key);
                    assignedBranchNames.Add(kvp.Value);
                    branchOverrides.Add(new BranchServiceOverrideDto
                    {
                        BranchId = kvp.Key,
                        BranchName = kvp.Value,
                        PriceOverride = finalPriceOv,
                        DurationOverride = finalDurOv
                    });
                }
            }
            else
            {
                var activeExisting = existingBranchServices.Where(bs => bs.IsActive).ToList();
                assignedBranchIds = activeExisting.Select(bs => bs.BranchId).ToList();
                assignedBranchNames = activeExisting
                    .Where(bs => bs.Branch != null)
                    .Select(bs => bs.Branch.Name)
                    .ToList();
                branchOverrides = activeExisting.Select(bs => new BranchServiceOverrideDto
                {
                    BranchId = bs.BranchId,
                    BranchName = bs.Branch?.Name ?? string.Empty,
                    PriceOverride = bs.PriceOverride,
                    DurationOverride = bs.DurationOverride
                }).ToList();
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var response = new ServiceResponseDto
            {
                Id = service.Id,
                BusinessId = service.BusinessId,
                Name = service.Name,
                Description = service.Description,
                BasePrice = service.BasePrice,
                DurationMinutes = service.DurationMinutes,
                ImageUrl = service.ImageUrl,
                IsActive = service.IsActive,
                AssignedBranchIds = assignedBranchIds,
                AssignedBranchNames = assignedBranchNames,
                BranchOverrides = branchOverrides
            };

            return DataResult<ServiceResponseDto>.Ok(response, "Hizmet başarıyla güncellendi.");
        }

        public async Task<IResult> DeleteServiceAsync(Guid serviceId, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var serviceRepo = _unitOfWork.Repository<Service>();
            var service = await serviceRepo.FirstOrDefaultAsync(
                s => s.Id == serviceId && s.BusinessId == businessId.Value,
                cancellationToken);

            if (service == null)
            {
                return Result.Fail("Hizmet bulunamadı.", 404);
            }

            serviceRepo.Remove(service);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Hizmet başarıyla silindi.");
        }

        public async Task<IDataResult<IReadOnlyList<ServiceResponseDto>>> GetBusinessServicesAsync(CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<IReadOnlyList<ServiceResponseDto>>.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var services = await _unitOfWork.Repository<Service>().QueryAsNoTracking()
                .Include(s => s.BranchServices)
                    .ThenInclude(bs => bs.Branch)
                .Where(s => s.BusinessId == businessId.Value)
                .ToListAsync(cancellationToken);

            var response = services.Select(s => new ServiceResponseDto
            {
                Id = s.Id,
                BusinessId = s.BusinessId,
                Name = s.Name,
                Description = s.Description,
                BasePrice = s.BasePrice,
                DurationMinutes = s.DurationMinutes,
                ImageUrl = s.ImageUrl,
                IsActive = s.IsActive,
                AssignedBranchIds = s.BranchServices.Where(bs => bs.IsActive).Select(bs => bs.BranchId).ToList(),
                AssignedBranchNames = s.BranchServices.Where(bs => bs.IsActive && bs.Branch != null).Select(bs => bs.Branch.Name).ToList(),
                BranchOverrides = s.BranchServices
                    .Where(bs => bs.IsActive)
                    .Select(bs => new BranchServiceOverrideDto
                    {
                        BranchId = bs.BranchId,
                        BranchName = bs.Branch != null ? bs.Branch.Name : string.Empty,
                        PriceOverride = bs.PriceOverride,
                        DurationOverride = bs.DurationOverride
                    })
                    .ToList()
            }).ToList();

            return DataResult<IReadOnlyList<ServiceResponseDto>>.Ok(response);
        }

        public async Task<IResult> AssignServiceToBranchAsync(AssignBranchServiceRequestDto request, CancellationToken cancellationToken = default)
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
                return Result.Fail("Şube işletmenize ait değil veya bulunamadı.", 404);
            }

            var service = await _unitOfWork.Repository<Service>().FirstOrDefaultAsync(
                s => s.Id == request.ServiceId && s.BusinessId == businessId.Value,
                cancellationToken);

            if (service == null)
            {
                return Result.Fail("Hizmet işletmenize ait değil veya bulunamadı.", 404);
            }

            var branchServiceRepo = _unitOfWork.Repository<BranchService>();
            var existing = await branchServiceRepo.FirstOrDefaultAsync(
                bs => bs.BranchId == request.BranchId && bs.ServiceId == request.ServiceId,
                cancellationToken);

            if (existing != null)
            {
                existing.PriceOverride = request.PriceOverride;
                existing.DurationOverride = request.DurationOverride;
                existing.IsActive = request.IsActive;
                branchServiceRepo.Update(existing);
            }
            else
            {
                await branchServiceRepo.AddAsync(new BranchService
                {
                    Id = Guid.NewGuid(),
                    BranchId = request.BranchId,
                    ServiceId = request.ServiceId,
                    PriceOverride = request.PriceOverride,
                    DurationOverride = request.DurationOverride,
                    IsActive = request.IsActive
                }, cancellationToken);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Ok("Şube hizmet ayarları güncellendi.");
        }

        public async Task<IDataResult<IReadOnlyList<BranchServiceResponseDto>>> GetBranchServicesAsync(Guid branchId, CancellationToken cancellationToken = default)
        {
            var branch = await _unitOfWork.Repository<Branch>().FirstOrDefaultAsync(b => b.Id == branchId && b.IsActive, cancellationToken);
            if (branch == null)
            {
                return DataResult<IReadOnlyList<BranchServiceResponseDto>>.Ok(new List<BranchServiceResponseDto>());
            }

            var branchServices = await _unitOfWork.Repository<BranchService>().QueryAsNoTracking()
                .Include(bs => bs.Service)
                .Where(bs => bs.BranchId == branchId &&
                             bs.IsActive &&
                             bs.Service.IsActive &&
                             bs.Service.BusinessId == branch.BusinessId)
                .ToListAsync(cancellationToken);

            var response = branchServices.Select(bs => new BranchServiceResponseDto
            {
                Id = bs.Id,
                BranchId = bs.BranchId,
                ServiceId = bs.ServiceId,
                ServiceName = bs.Service.Name,
                Description = bs.Service.Description,
                FinalPrice = bs.PriceOverride ?? bs.Service.BasePrice,
                FinalDurationMinutes = bs.DurationOverride ?? bs.Service.DurationMinutes,
                IsActive = bs.IsActive
            }).ToList();

            return DataResult<IReadOnlyList<BranchServiceResponseDto>>.Ok(response);
        }

        public async Task<IResult> AssignServicesToStaffAsync(AssignStaffServicesRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var staff = await _unitOfWork.Repository<StaffProfile>().Query()
                .Include(sp => sp.BusinessMember)
                .Include(sp => sp.BranchAssignments)
                .FirstOrDefaultAsync(
                    sp => sp.Id == request.StaffProfileId && sp.BusinessMember.BusinessId == businessId.Value,
                    cancellationToken);

            if (staff == null)
            {
                return Result.Fail("Çalışan kaydı bulunamadı.", 404);
            }

            var staffServiceRepo = _unitOfWork.Repository<StaffService>();
            var distinctServiceIds = (request.ServiceIds ?? new List<Guid>()).Distinct().ToList();

            if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            {
                var targetBranchId = request.BranchId.Value;
                if (!staff.BranchAssignments.Any(ba => ba.BranchId == targetBranchId))
                {
                    return Result.Fail("Çalışan seçilen şubeye atanmamış.", 400);
                }

                var existingForBranch = await staffServiceRepo.GetAsync(
                    ss => ss.StaffProfileId == request.StaffProfileId && ss.BranchId == targetBranchId,
                    cancellationToken);
                staffServiceRepo.RemoveRange(existingForBranch);

                if (distinctServiceIds.Count > 0)
                {
                    var validBranchServiceIds = await _unitOfWork.Repository<BranchService>().Query()
                        .Include(bs => bs.Service)
                        .Where(bs => bs.BranchId == targetBranchId &&
                                     bs.IsActive &&
                                     bs.Service.BusinessId == businessId.Value &&
                                     distinctServiceIds.Contains(bs.ServiceId))
                        .Select(bs => bs.ServiceId)
                        .Distinct()
                        .ToListAsync(cancellationToken);

                    foreach (var serviceId in validBranchServiceIds)
                    {
                        await staffServiceRepo.AddAsync(new StaffService
                        {
                            StaffProfileId = request.StaffProfileId,
                            BranchId = targetBranchId,
                            ServiceId = serviceId
                        }, cancellationToken);
                    }
                }
            }
            else
            {
                var assignedBranchIds = staff.BranchAssignments.Select(ba => ba.BranchId).Distinct().ToList();
                var existingStaffServices = await staffServiceRepo.GetAsync(
                    ss => ss.StaffProfileId == request.StaffProfileId,
                    cancellationToken);
                staffServiceRepo.RemoveRange(existingStaffServices);

                if (distinctServiceIds.Count > 0 && assignedBranchIds.Count > 0)
                {
                    var validPairs = await _unitOfWork.Repository<BranchService>().Query()
                        .Include(bs => bs.Service)
                        .Where(bs => assignedBranchIds.Contains(bs.BranchId) &&
                                     bs.IsActive &&
                                     bs.Service.BusinessId == businessId.Value &&
                                     distinctServiceIds.Contains(bs.ServiceId))
                        .Select(bs => new { bs.BranchId, bs.ServiceId })
                        .Distinct()
                        .ToListAsync(cancellationToken);

                    foreach (var pair in validPairs)
                    {
                        await staffServiceRepo.AddAsync(new StaffService
                        {
                            StaffProfileId = request.StaffProfileId,
                            BranchId = pair.BranchId,
                            ServiceId = pair.ServiceId
                        }, cancellationToken);
                    }
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Ok("Çalışan hizmet yetkinlikleri başarıyla güncellendi.");
        }

        public async Task<IResult> AssignMyServicesAsync(AssignStaffServicesRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var staffQuery = _unitOfWork.Repository<StaffProfile>().QueryAsNoTracking()
                .Include(sp => sp.BusinessMember)
                .Include(sp => sp.BranchAssignments)
                .Where(sp => sp.BusinessMember.UserId == userId.Value && sp.BusinessMember.IsActive);

            var staff = request.StaffProfileId != Guid.Empty
                ? await staffQuery.FirstOrDefaultAsync(sp => sp.Id == request.StaffProfileId, cancellationToken)
                : await staffQuery.FirstOrDefaultAsync(cancellationToken);

            if (staff == null)
            {
                return Result.Fail("Seçilen salona ait aktif bir çalışan profiliniz bulunamadı.", 404);
            }

            var businessId = staff.BusinessMember.BusinessId;
            var staffServiceRepo = _unitOfWork.Repository<StaffService>();
            var distinctIds = (request.ServiceIds ?? new List<Guid>()).Distinct().ToList();

            if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            {
                var targetBranchId = request.BranchId.Value;
                if (!staff.BranchAssignments.Any(ba => ba.BranchId == targetBranchId))
                {
                    return Result.Fail("Seçilen şubede aktif bir çalışma atamanız bulunamadı.", 403);
                }

                var existingForBranch = await staffServiceRepo.GetAsync(
                    ss => ss.StaffProfileId == staff.Id && ss.BranchId == targetBranchId,
                    cancellationToken);

                staffServiceRepo.RemoveRange(existingForBranch);

                if (distinctIds.Count > 0)
                {
                    var validServiceIds = await _unitOfWork.Repository<BranchService>().Query()
                        .Include(bs => bs.Service)
                        .Where(bs => bs.BranchId == targetBranchId &&
                                     bs.IsActive &&
                                     bs.Service.BusinessId == businessId &&
                                     bs.Service.IsActive &&
                                     distinctIds.Contains(bs.ServiceId))
                        .Select(bs => bs.ServiceId)
                        .Distinct()
                        .ToListAsync(cancellationToken);

                    foreach (var serviceId in validServiceIds)
                    {
                        await staffServiceRepo.AddAsync(new StaffService
                        {
                            StaffProfileId = staff.Id,
                            BranchId = targetBranchId,
                            ServiceId = serviceId
                        }, cancellationToken);
                    }
                }
            }
            else
            {
                var assignedBranchIds = staff.BranchAssignments.Select(ba => ba.BranchId).Distinct().ToList();
                var existingStaffServices = await staffServiceRepo.GetAsync(
                    ss => ss.StaffProfileId == staff.Id,
                    cancellationToken);

                staffServiceRepo.RemoveRange(existingStaffServices);

                if (distinctIds.Count > 0 && assignedBranchIds.Count > 0)
                {
                    var validPairs = await _unitOfWork.Repository<BranchService>().Query()
                        .Include(bs => bs.Service)
                        .Where(bs => assignedBranchIds.Contains(bs.BranchId) &&
                                     bs.IsActive &&
                                     bs.Service.BusinessId == businessId &&
                                     bs.Service.IsActive &&
                                     distinctIds.Contains(bs.ServiceId))
                        .Select(bs => new { bs.BranchId, bs.ServiceId })
                        .Distinct()
                        .ToListAsync(cancellationToken);

                    foreach (var pair in validPairs)
                    {
                        await staffServiceRepo.AddAsync(new StaffService
                        {
                            StaffProfileId = staff.Id,
                            BranchId = pair.BranchId,
                            ServiceId = pair.ServiceId
                        }, cancellationToken);
                    }
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Ok("Seçili şube için verdiğiniz hizmetler güncellendi.");
        }

        public async Task<IDataResult<IReadOnlyList<ServiceResponseDto>>> GetMyAssignedServicesAsync(Guid? staffProfileId = null, Guid? branchId = null, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<IReadOnlyList<ServiceResponseDto>>.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var staffQuery = _unitOfWork.Repository<StaffProfile>().QueryAsNoTracking()
                .Include(sp => sp.BusinessMember)
                .Where(sp => sp.BusinessMember.UserId == userId.Value && sp.BusinessMember.IsActive);

            var staff = staffProfileId.HasValue && staffProfileId.Value != Guid.Empty
                ? await staffQuery.FirstOrDefaultAsync(sp => sp.Id == staffProfileId.Value, cancellationToken)
                : await staffQuery.FirstOrDefaultAsync(cancellationToken);

            if (staff == null)
            {
                return DataResult<IReadOnlyList<ServiceResponseDto>>.Ok(new List<ServiceResponseDto>());
            }

            return await GetStaffServicesAsync(staff.Id, branchId, cancellationToken);
        }

        public async Task<IDataResult<IReadOnlyList<ServiceResponseDto>>> GetStaffServicesAsync(Guid staffProfileId, Guid? branchId = null, CancellationToken cancellationToken = default)
        {
            var query = _unitOfWork.Repository<StaffService>().QueryAsNoTracking()
                .Include(ss => ss.Service)
                .Where(ss => ss.StaffProfileId == staffProfileId && ss.Service.IsActive);

            if (branchId.HasValue && branchId.Value != Guid.Empty)
            {
                query = query.Where(ss => ss.BranchId == branchId.Value);
            }

            var staffServices = await query.ToListAsync(cancellationToken);

            var response = staffServices
                .GroupBy(ss => ss.Service.Id)
                .Select(g => g.First().Service)
                .Select(s => new ServiceResponseDto
                {
                    Id = s.Id,
                    BusinessId = s.BusinessId,
                    Name = s.Name,
                    Description = s.Description,
                    BasePrice = s.BasePrice,
                    DurationMinutes = s.DurationMinutes,
                    ImageUrl = s.ImageUrl,
                    IsActive = s.IsActive
                }).ToList();

            return DataResult<IReadOnlyList<ServiceResponseDto>>.Ok(response);
        }
    }
}