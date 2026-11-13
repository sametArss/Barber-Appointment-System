using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Identity;
using BarberBooking.Entities.Subscriptions;
using BarberBooking.Shared.DTOs.Businesses;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using BusinessEntity = BarberBooking.Entities.Businesses.Business;

namespace BarberBooking.Business.Services
{
    public class BusinessManager : IBusinessService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;
        private readonly ISubscriptionService _subscriptionService;

        public BusinessManager(
            IUnitOfWork unitOfWork,
            ICurrentTenantService tenantService,
            ISubscriptionService subscriptionService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
            _subscriptionService = subscriptionService;
        }

        public async Task<IDataResult<BusinessResponseDto>> CreateBusinessAsync(CreateBusinessRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<BusinessResponseDto>.Fail("Kullanıcı kimliği doğrulanamadı.", 401);
            }

            var memberRepo = _unitOfWork.Repository<BusinessMember>();
            var existingMembership = await memberRepo.AnyAsync(m => m.UserId == userId.Value, cancellationToken);
            if (existingMembership)
            {
                return DataResult<BusinessResponseDto>.Fail("Zaten bir işletmeye sahipsiniz veya üyesisiniz.", 400);
            }

            await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var businessId = Guid.NewGuid();
                var business = new BusinessEntity
                {
                    Id = businessId,
                    Name = request.Name.Trim(),
                    Description = request.Description?.Trim(),
                    PhoneNumber = request.PhoneNumber.Trim(),
                    IsActive = true
                };

                await _unitOfWork.Repository<BusinessEntity>().AddAsync(business, cancellationToken);

                // İşletme Üyeliği Kaydı
                var member = new BusinessMember
                {
                    Id = Guid.NewGuid(),
                    BusinessId = businessId,
                    UserId = userId.Value
                };
                await memberRepo.AddAsync(member, cancellationToken);

                // Kullanıcıya BusinessOwner Rolü Atama
                var roleRepo = _unitOfWork.Repository<Role>();
                var ownerRole = await roleRepo.FirstOrDefaultAsync(r => r.Name == "BusinessOwner", cancellationToken);
                if (ownerRole == null)
                {
                    ownerRole = new Role { Id = Guid.NewGuid(), Name = "BusinessOwner" };
                    await roleRepo.AddAsync(ownerRole, cancellationToken);
                }

                var userRoleRepo = _unitOfWork.Repository<UserRole>();
                var hasRole = await userRoleRepo.AnyAsync(ur => ur.UserId == userId.Value && ur.RoleId == ownerRole.Id, cancellationToken);
                if (!hasRole)
                {
                    await userRoleRepo.AddAsync(new UserRole
                    {
                        UserId = userId.Value,
                        RoleId = ownerRole.Id
                    }, cancellationToken);
                }

                // Varsayılan Merkez Şube
                var branchLocation = new Point(request.Longitude, request.Latitude) { SRID = 4326 };
                var branch = new Branch
                {
                    Id = Guid.NewGuid(),
                    BusinessId = businessId,
                    Name = request.BranchName.Trim(),
                    Address = request.Address.Trim(),
                    City = request.City.Trim(),
                    District = request.District.Trim(),
                    Location = branchLocation,
                    TimeZoneId = "Europe/Istanbul",
                    IsActive = true
                };

                await _unitOfWork.Repository<Branch>().AddAsync(branch, cancellationToken);

                // Varsayılan Başlangıç (Starter) Aboneliği Ataması (Max 1 Şube, 3 Personel)
                var starterPlan = await _unitOfWork.Repository<SubscriptionPlan>()
                    .FirstOrDefaultAsync(p => p.Name == "Starter" && p.IsActive, cancellationToken);
                if (starterPlan != null)
                {
                    var now = DateTimeOffset.UtcNow;
                    await _unitOfWork.Repository<BusinessSubscription>().AddAsync(new BusinessSubscription
                    {
                        Id = Guid.NewGuid(),
                        BusinessId = businessId,
                        PlanId = starterPlan.Id,
                        Status = SubscriptionStatus.Active,
                        BillingCycle = SubscriptionBillingCycle.Monthly,
                        StartDate = now,
                        EndDate = now.AddMonths(1),
                        AutoRenew = true
                    }, cancellationToken);
                }

                await _unitOfWork.CommitTransactionAsync(cancellationToken);

                var response = new BusinessResponseDto
                {
                    Id = business.Id,
                    Name = business.Name,
                    Description = business.Description,
                    IsActive = business.IsActive,
                    Branches = new List<BranchResponseDto>
                    {
                        new()
                        {
                            Id = branch.Id,
                            BusinessId = branch.BusinessId,
                            Name = branch.Name,
                            Address = branch.Address,
                            City = branch.City,
                            District = branch.District,
                            PhoneNumber = business.PhoneNumber,
                            Longitude = branch.Location.X,
                            Latitude = branch.Location.Y,
                            IsActive = branch.IsActive
                        }
                    }
                };

                return DataResult<BusinessResponseDto>.Ok(response, "İşletme ve merkez şube başarıyla oluşturuldu.");
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }

        public async Task<IDataResult<BranchResponseDto>> AddBranchAsync(CreateBranchRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<BranchResponseDto>.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var limitCheck = await _subscriptionService.CheckBranchLimitAsync(businessId.Value, cancellationToken);
            if (!limitCheck.Success)
            {
                return DataResult<BranchResponseDto>.Fail(limitCheck.Message ?? "Paket şube limitine ulaşıldı.", 403);
            }

            var branchLocation = new Point(request.Longitude, request.Latitude) { SRID = 4326 };
            var branch = new Branch
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId.Value,
                Name = request.Name.Trim(),
                Address = request.Address.Trim(),
                City = request.City.Trim(),
                District = request.District.Trim(),
                Location = branchLocation,
                TimeZoneId = "Europe/Istanbul",
                IsActive = true
            };

            await _unitOfWork.Repository<Branch>().AddAsync(branch, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var response = new BranchResponseDto
            {
                Id = branch.Id,
                BusinessId = branch.BusinessId,
                Name = branch.Name,
                Address = branch.Address,
                City = branch.City,
                District = branch.District,
                PhoneNumber = request.PhoneNumber,
                Longitude = branch.Location.X,
                Latitude = branch.Location.Y,
                IsActive = branch.IsActive
            };

            return DataResult<BranchResponseDto>.Ok(response, "Yeni şube başarıyla eklendi.");
        }

        public async Task<IDataResult<BusinessResponseDto>> GetMyBusinessAsync(CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<BusinessResponseDto>.Fail("Bağlı olduğunuz bir işletme bulunamadı.", 404);
            }

            var business = await _unitOfWork.Repository<BusinessEntity>().Query()
                .Include(b => b.Branches)
                .FirstOrDefaultAsync(b => b.Id == businessId.Value, cancellationToken);

            if (business == null)
            {
                return DataResult<BusinessResponseDto>.Fail("İşletme kaydı bulunamadı.", 404);
            }

            var response = new BusinessResponseDto
            {
                Id = business.Id,
                Name = business.Name,
                Description = business.Description,
                IsActive = business.IsActive,
                Branches = business.Branches.Select(br => new BranchResponseDto
                {
                    Id = br.Id,
                    BusinessId = br.BusinessId,
                    Name = br.Name,
                    Address = br.Address,
                    City = br.City,
                    District = br.District,
                    PhoneNumber = business.PhoneNumber,
                    Longitude = br.Location?.X ?? 0,
                    Latitude = br.Location?.Y ?? 0,
                    IsActive = br.IsActive
                }).ToList()
            };

            return DataResult<BusinessResponseDto>.Ok(response);
        }

        public async Task<IDataResult<IReadOnlyList<BranchResponseDto>>> GetMyBranchesAsync(CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<IReadOnlyList<BranchResponseDto>>.Fail("Bağlı olduğunuz bir işletme bulunamadı.", 404);
            }

            var branches = await _unitOfWork.Repository<Branch>()
                .GetAsync(b => b.BusinessId == businessId.Value, cancellationToken);

            var business = await _unitOfWork.Repository<BusinessEntity>().GetByIdAsync(businessId.Value, cancellationToken);
            var phone = business?.PhoneNumber ?? string.Empty;

            var response = branches.Select(br => new BranchResponseDto
            {
                Id = br.Id,
                BusinessId = br.BusinessId,
                Name = br.Name,
                Address = br.Address,
                City = br.City,
                District = br.District,
                PhoneNumber = phone,
                Longitude = br.Location?.X ?? 0,
                Latitude = br.Location?.Y ?? 0,
                IsActive = br.IsActive
            }).ToList();

            return DataResult<IReadOnlyList<BranchResponseDto>>.Ok(response);
        }
    }
}