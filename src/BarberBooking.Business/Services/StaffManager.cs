using BarberBooking.Business.Security;
using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Identity;
using BarberBooking.Entities.Scheduling;
using BarberBooking.Entities.Services;
using BarberBooking.Shared.DTOs.Staff;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.Business.Services
{
    public class StaffManager : IStaffService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ISubscriptionService _subscriptionService;

        public StaffManager(
            IUnitOfWork unitOfWork,
            ICurrentTenantService tenantService,
            IPasswordHasher passwordHasher,
            ISubscriptionService subscriptionService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
            _passwordHasher = passwordHasher;
            _subscriptionService = subscriptionService;
        }

        public async Task<IDataResult<StaffResponseDto>> CreateStaffAsync(CreateStaffRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<StaffResponseDto>.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            if (request.BranchIds.Count > 0)
            {
                foreach (var branchId in request.BranchIds.Distinct())
                {
                    var limitCheck = await _subscriptionService.CheckStaffLimitAsync(businessId.Value, branchId, cancellationToken);
                    if (!limitCheck.Success)
                    {
                        return DataResult<StaffResponseDto>.Fail(limitCheck.Message ?? "Paket personel limitine ulaşıldı.", 403);
                    }
                }
            }

            var emailTrimmed = request.Email.Trim();
            var emailNormalized = emailTrimmed.ToUpperInvariant();
            var userRepo = _unitOfWork.Repository<User>();

            await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var user = await userRepo.FirstOrDefaultAsync(u => u.NormalizedEmail == emailNormalized, cancellationToken);
                if (user == null)
                {
                    await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                    return DataResult<StaffResponseDto>.Fail(
                        "Bu e-posta ile kayıtlı bir kullanıcı bulunamadı. Personelin önce sisteme üye olması gerekmektedir.",
                        404);
                }

                var accountAlreadyExisted = true;
                string? temporaryPassword = null;

                // Employee Rolü
                var roleRepo = _unitOfWork.Repository<Role>();
                var employeeRole = await roleRepo.FirstOrDefaultAsync(r => r.Name == "Employee", cancellationToken);
                if (employeeRole == null)
                {
                    employeeRole = new Role { Id = Guid.NewGuid(), Name = "Employee" };
                    await roleRepo.AddAsync(employeeRole, cancellationToken);
                }

                var userRoleRepo = _unitOfWork.Repository<UserRole>();
                var hasRole = await userRoleRepo.AnyAsync(ur => ur.UserId == user.Id && ur.RoleId == employeeRole.Id, cancellationToken);
                if (!hasRole)
                {
                    await userRoleRepo.AddAsync(new UserRole { UserId = user.Id, RoleId = employeeRole.Id }, cancellationToken);
                }

                // BusinessMember (İşletme Üyeliği)
                var memberRepo = _unitOfWork.Repository<BusinessMember>();
                var member = await memberRepo.FirstOrDefaultAsync(
                    m => m.UserId == user.Id && m.BusinessId == businessId.Value,
                    cancellationToken);

                if (member == null)
                {
                    member = new BusinessMember
                    {
                        Id = Guid.NewGuid(),
                        BusinessId = businessId.Value,
                        UserId = user.Id,
                        Role = BusinessRole.Staff
                    };
                    await memberRepo.AddAsync(member, cancellationToken);
                }

                // StaffProfile
                var staffProfileRepo = _unitOfWork.Repository<StaffProfile>();
                var existingProfile = await staffProfileRepo.FirstOrDefaultAsync(
                    sp => sp.BusinessMemberId == member.Id,
                    cancellationToken);

                if (existingProfile != null)
                {
                    await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                    return DataResult<StaffResponseDto>.Fail("Bu çalışan için zaten bir profil oluşturulmuş.", 400);
                }

                var staffProfile = new StaffProfile
                {
                    Id = Guid.NewGuid(),
                    BusinessMemberId = member.Id,
                    Biography = string.IsNullOrWhiteSpace(request.Biography) ? null : request.Biography.Trim(),
                    ProfileImageUrl = request.ProfileImageUrl?.Trim(),
                    IsBookable = request.IsBookable
                };
                await staffProfileRepo.AddAsync(staffProfile, cancellationToken);

                // Şube Atamaları
                if (request.BranchIds.Count > 0)
                {
                    var branchRepo = _unitOfWork.Repository<Branch>();
                    var validBranchIds = await branchRepo.Query()
                        .Where(b => b.BusinessId == businessId.Value && request.BranchIds.Contains(b.Id))
                        .Select(b => b.Id)
                        .ToListAsync(cancellationToken);

                    var assignmentRepo = _unitOfWork.Repository<StaffBranchAssignment>();
                    var workingHourRepo = _unitOfWork.Repository<StaffWorkingHour>();
                    var breakRepo = _unitOfWork.Repository<StaffWorkingHourBreak>();

                    foreach (var branchId in validBranchIds)
                    {
                        await assignmentRepo.AddAsync(new StaffBranchAssignment
                        {
                            StaffProfileId = staffProfile.Id,
                            BranchId = branchId,
                            AssignedAt = DateTimeOffset.UtcNow
                        }, cancellationToken);

                        // Varsayılan 7 gün mesai (09:00 - 19:00) ve öğle molası (13:00 - 14:00)
                        for (int day = 0; day <= 6; day++)
                        {
                            var newHour = new StaffWorkingHour
                            {
                                Id = Guid.NewGuid(),
                                StaffProfileId = staffProfile.Id,
                                BranchId = branchId,
                                DayOfWeek = (DayOfWeek)day,
                                StartTime = new TimeOnly(9, 0),
                                EndTime = new TimeOnly(19, 0)
                            };
                            await workingHourRepo.AddAsync(newHour, cancellationToken);

                            await breakRepo.AddAsync(new StaffWorkingHourBreak
                            {
                                Id = Guid.NewGuid(),
                                StaffWorkingHourId = newHour.Id,
                                StartTime = new TimeOnly(13, 0),
                                EndTime = new TimeOnly(14, 0)
                            }, cancellationToken);
                        }
                    }
                }

                await _unitOfWork.CommitTransactionAsync(cancellationToken);

                var response = new StaffResponseDto
                {
                    Id = staffProfile.Id,
                    BusinessMemberId = member.Id,
                    UserId = user.Id,
                    BusinessId = member.BusinessId,
                    FullName = $"{user.FirstName} {user.LastName}",
                    Email = user.Email,
                    PhoneNumber = user.PhoneNumber,
                    TemporaryPassword = temporaryPassword,
                    AccountAlreadyExisted = accountAlreadyExisted,
                    Biography = staffProfile.Biography,
                    ProfileImageUrl = staffProfile.ProfileImageUrl,
                    IsBookable = staffProfile.IsBookable,
                    AssignedBranchIds = request.BranchIds
                };

                return DataResult<StaffResponseDto>.Ok(response, "Çalışan başarıyla oluşturuldu ve atandı.");
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }

        public async Task<IResult> AssignBranchesAsync(AssignStaffBranchesRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return Result.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var staffRepo = _unitOfWork.Repository<StaffProfile>();
            var staff = await staffRepo.Query()
                .Include(sp => sp.BusinessMember)
                .FirstOrDefaultAsync(
                    sp => sp.Id == request.StaffProfileId && sp.BusinessMember.BusinessId == businessId.Value,
                    cancellationToken);

            if (staff == null)
            {
                return Result.Fail("Çalışan kaydı bulunamadı.", 404);
            }

            var assignmentRepo = _unitOfWork.Repository<StaffBranchAssignment>();
            var existingAssignments = await assignmentRepo.GetAsync(
                a => a.StaffProfileId == request.StaffProfileId,
                cancellationToken);

            var existingBranchIds = existingAssignments.Select(a => a.BranchId).ToHashSet();

            if (request.BranchIds.Count > 0)
            {
                var branchRepo = _unitOfWork.Repository<Branch>();
                var validBranchIds = await branchRepo.QueryAsNoTracking()
                    .Where(b => b.BusinessId == businessId.Value && request.BranchIds.Contains(b.Id))
                    .Select(b => b.Id)
                    .ToListAsync(cancellationToken);

                // Yeni eklenecek şubeler için abonelik personel limiti kontrolü
                foreach (var branchId in validBranchIds.Where(id => !existingBranchIds.Contains(id)))
                {
                    var limitCheck = await _subscriptionService.CheckStaffLimitAsync(businessId.Value, branchId, cancellationToken);
                    if (!limitCheck.Success)
                    {
                        return limitCheck;
                    }
                }

                assignmentRepo.RemoveRange(existingAssignments);

                foreach (var branchId in validBranchIds)
                {
                    await assignmentRepo.AddAsync(new StaffBranchAssignment
                    {
                        StaffProfileId = request.StaffProfileId,
                        BranchId = branchId,
                        AssignedAt = DateTimeOffset.UtcNow
                    }, cancellationToken);
                }
            }
            else
            {
                assignmentRepo.RemoveRange(existingAssignments);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Ok("Şube atamaları başarıyla güncellendi.");
        }

        public async Task<IResult> UpdateStaffProfileAsync(UpdateStaffProfileRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue) return Result.Fail("İşletme yetkiniz bulunamadı.", 403);

            var staffRepo = _unitOfWork.Repository<StaffProfile>();
            var staff = await staffRepo.Query().Include(sp => sp.BusinessMember)
                .FirstOrDefaultAsync(sp => sp.Id == request.StaffProfileId && sp.BusinessMember.BusinessId == businessId.Value, cancellationToken);
            if (staff == null) return Result.Fail("Personel kaydı bulunamadı.", 404);

            staff.Biography = string.IsNullOrWhiteSpace(request.Biography) ? null : request.Biography.Trim();
            staff.ProfileImageUrl = request.ProfileImageUrl?.Trim();
            staff.IsBookable = request.IsBookable;
            staff.UpdatedAt = DateTimeOffset.UtcNow;
            staffRepo.Update(staff);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Ok("Personel profili güncellendi.");
        }

        public async Task<IResult> UpdateMyBiographyAsync(UpdateMyStaffBiographyRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var staffRepo = _unitOfWork.Repository<StaffProfile>();
            var profiles = await staffRepo.Query()
                .Include(sp => sp.BusinessMember)
                .Where(sp => sp.BusinessMember.UserId == userId.Value && sp.BusinessMember.IsActive)
                .ToListAsync(cancellationToken);

            if (profiles.Count == 0)
            {
                return Result.Fail("Çalışan profili bulunamadı.", 404);
            }

            var normalizedBio = string.IsNullOrWhiteSpace(request.Biography) ? null : request.Biography.Trim();
            foreach (var profile in profiles)
            {
                profile.Biography = normalizedBio;
                profile.UpdatedAt = DateTimeOffset.UtcNow;
                staffRepo.Update(profile);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Ok("Uzmanlık alanınız güncellendi.");
        }

        public async Task<IDataResult<IReadOnlyList<StaffResponseDto>>> GetBusinessStaffAsync(CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<IReadOnlyList<StaffResponseDto>>.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var staffList = await _unitOfWork.Repository<StaffProfile>().QueryAsNoTracking()
                .Include(sp => sp.BusinessMember)
                    .ThenInclude(bm => bm.User)
                .Include(sp => sp.BranchAssignments)
                .Where(sp => sp.BusinessMember.BusinessId == businessId.Value)
                .ToListAsync(cancellationToken);

            var staffIds = staffList.Select(sp => sp.Id).ToList();
            var staffServicesLookup = (await _unitOfWork.Repository<StaffService>().QueryAsNoTracking()
                .Include(ss => ss.Service)
                .Where(ss => staffIds.Contains(ss.StaffProfileId) && ss.Service.IsActive)
                .ToListAsync(cancellationToken))
                .GroupBy(ss => ss.StaffProfileId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var response = staffList.Select(sp =>
            {
                staffServicesLookup.TryGetValue(sp.Id, out var assignedServices);
                return new StaffResponseDto
                {
                    Id = sp.Id,
                    BusinessMemberId = sp.BusinessMemberId,
                    UserId = sp.BusinessMember.UserId,
                    BusinessId = sp.BusinessMember.BusinessId,
                    FullName = $"{sp.BusinessMember.User.FirstName} {sp.BusinessMember.User.LastName}",
                    Email = sp.BusinessMember.User.Email,
                    PhoneNumber = sp.BusinessMember.User.PhoneNumber,
                    Biography = sp.Biography,
                    ProfileImageUrl = sp.ProfileImageUrl,
                    IsBookable = sp.IsBookable,
                    AssignedBranchIds = sp.BranchAssignments.Select(ba => ba.BranchId).ToList(),
                    AssignedServiceIds = assignedServices?.Select(ss => ss.ServiceId).Distinct().ToList() ?? new List<Guid>(),
                    AssignedServiceNames = assignedServices?.Select(ss => ss.Service.Name).Distinct().ToList() ?? new List<string>()
                };
            }).ToList();

            return DataResult<IReadOnlyList<StaffResponseDto>>.Ok(response);
        }

        public async Task<IDataResult<IReadOnlyList<StaffResponseDto>>> GetBranchStaffAsync(Guid branchId, CancellationToken cancellationToken = default)
        {
            var assignments = await _unitOfWork.Repository<StaffBranchAssignment>().QueryAsNoTracking()
                .Include(a => a.StaffProfile)
                    .ThenInclude(sp => sp.BusinessMember)
                        .ThenInclude(bm => bm.User)
                .Where(a => a.BranchId == branchId && a.StaffProfile.IsBookable)
                .ToListAsync(cancellationToken);

            var staffIds = assignments.Select(a => a.StaffProfileId).Distinct().ToList();
            var staffServicesLookup = (await _unitOfWork.Repository<StaffService>().QueryAsNoTracking()
                .Include(ss => ss.Service)
                .Where(ss => staffIds.Contains(ss.StaffProfileId) && ss.BranchId == branchId && ss.Service.IsActive)
                .ToListAsync(cancellationToken))
                .GroupBy(ss => ss.StaffProfileId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var response = assignments.Select(a =>
            {
                staffServicesLookup.TryGetValue(a.StaffProfile.Id, out var assignedServices);
                return new StaffResponseDto
                {
                    Id = a.StaffProfile.Id,
                    BusinessMemberId = a.StaffProfile.BusinessMemberId,
                    UserId = a.StaffProfile.BusinessMember.UserId,
                    BusinessId = a.StaffProfile.BusinessMember.BusinessId,
                    FullName = $"{a.StaffProfile.BusinessMember.User.FirstName} {a.StaffProfile.BusinessMember.User.LastName}",
                    // Public/anonim şube personel listesinde kişisel iletişim PII'ı döndürülmez (KVKK/GDPR)
                    Email = string.Empty,
                    PhoneNumber = string.Empty,
                    Biography = a.StaffProfile.Biography,
                    ProfileImageUrl = a.StaffProfile.ProfileImageUrl,
                    IsBookable = a.StaffProfile.IsBookable,
                    AssignedBranchIds = new List<Guid> { a.BranchId },
                    AssignedServiceIds = assignedServices?.Select(ss => ss.ServiceId).ToList() ?? new List<Guid>(),
                    AssignedServiceNames = assignedServices?.Select(ss => ss.Service.Name).ToList() ?? new List<string>()
                };
            }).ToList();

            return DataResult<IReadOnlyList<StaffResponseDto>>.Ok(response);
        }

        public async Task<IDataResult<IReadOnlyList<EmployeeWorkplaceResponseDto>>> GetMyWorkplacesAsync(CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
                return DataResult<IReadOnlyList<EmployeeWorkplaceResponseDto>>.Fail("Oturum açmanız gerekmektedir.", 401);

            var profiles = await _unitOfWork.Repository<StaffProfile>().QueryAsNoTracking()
                .Include(profile => profile.BusinessMember).ThenInclude(member => member.Business)
                .Include(profile => profile.BranchAssignments).ThenInclude(assignment => assignment.Branch)
                .Where(profile => profile.BusinessMember.UserId == userId.Value && profile.BusinessMember.IsActive)
                .ToListAsync(cancellationToken);

            var workplaces = profiles.SelectMany(profile => profile.BranchAssignments.Select(assignment => new EmployeeWorkplaceResponseDto
            {
                StaffProfileId = profile.Id,
                BusinessId = profile.BusinessMember.BusinessId,
                BusinessName = profile.BusinessMember.Business.Name,
                BranchId = assignment.BranchId,
                BranchName = assignment.Branch.Name,
                Address = assignment.Branch.Address,
                City = assignment.Branch.City,
                District = assignment.Branch.District,
                BusinessPhoneNumber = profile.BusinessMember.Business.PhoneNumber,
                Biography = profile.Biography,
                IsBookable = profile.IsBookable
            })).ToList();

            return DataResult<IReadOnlyList<EmployeeWorkplaceResponseDto>>.Ok(workplaces);
        }
    }
}
