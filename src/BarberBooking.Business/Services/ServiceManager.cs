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

            if (request.AssignToBranchIds != null && request.AssignToBranchIds.Count > 0)
            {
                var branchRepo = _unitOfWork.Repository<Branch>();
                var validBranchIds = await branchRepo.Query()
                    .Where(b => b.BusinessId == businessId.Value && request.AssignToBranchIds.Contains(b.Id))
                    .Select(b => b.Id)
                    .ToListAsync(cancellationToken);

                var branchServiceRepo = _unitOfWork.Repository<BranchService>();
                foreach (var branchId in validBranchIds)
                {
                    await branchServiceRepo.AddAsync(new BranchService
                    {
                        Id = Guid.NewGuid(),
                        BranchId = branchId,
                        ServiceId = service.Id,
                        IsActive = true
                    }, cancellationToken);
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
                IsActive = service.IsActive
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
                IsActive = service.IsActive
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

            var services = await _unitOfWork.Repository<Service>()
                .GetAsync(s => s.BusinessId == businessId.Value, cancellationToken);

            var response = services.Select(s => new ServiceResponseDto
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
            var branchServices = await _unitOfWork.Repository<BranchService>().Query()
                .Include(bs => bs.Service)
                .Where(bs => bs.BranchId == branchId && bs.IsActive && bs.Service.IsActive)
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
                .FirstOrDefaultAsync(
                    sp => sp.Id == request.StaffProfileId && sp.BusinessMember.BusinessId == businessId.Value,
                    cancellationToken);

            if (staff == null)
            {
                return Result.Fail("Çalışan kaydı bulunamadı.", 404);
            }

            var staffServiceRepo = _unitOfWork.Repository<StaffService>();
            var existingStaffServices = await staffServiceRepo.GetAsync(
                ss => ss.StaffProfileId == request.StaffProfileId,
                cancellationToken);

            staffServiceRepo.RemoveRange(existingStaffServices);

            if (request.ServiceIds.Count > 0)
            {
                var validServices = await _unitOfWork.Repository<Service>().Query()
                    .Where(s => s.BusinessId == businessId.Value && request.ServiceIds.Contains(s.Id))
                    .Select(s => s.Id)
                    .ToListAsync(cancellationToken);

                foreach (var serviceId in validServices)
                {
                    await staffServiceRepo.AddAsync(new StaffService
                    {
                        StaffProfileId = request.StaffProfileId,
                        ServiceId = serviceId
                    }, cancellationToken);
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Ok("Çalışan hizmet yetkinlikleri başarıyla güncellendi.");
        }

        public async Task<IDataResult<IReadOnlyList<ServiceResponseDto>>> GetStaffServicesAsync(Guid staffProfileId, CancellationToken cancellationToken = default)
        {
            var staffServices = await _unitOfWork.Repository<StaffService>().Query()
                .Include(ss => ss.Service)
                .Where(ss => ss.StaffProfileId == staffProfileId && ss.Service.IsActive)
                .ToListAsync(cancellationToken);

            var response = staffServices.Select(ss => new ServiceResponseDto
            {
                Id = ss.Service.Id,
                BusinessId = ss.Service.BusinessId,
                Name = ss.Service.Name,
                Description = ss.Service.Description,
                BasePrice = ss.Service.BasePrice,
                DurationMinutes = ss.Service.DurationMinutes,
                ImageUrl = ss.Service.ImageUrl,
                IsActive = ss.Service.IsActive
            }).ToList();

            return DataResult<IReadOnlyList<ServiceResponseDto>>.Ok(response);
        }
    }
}