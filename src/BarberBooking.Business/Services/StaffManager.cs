using BarberBooking.Business.Security;
using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Identity;
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

        public StaffManager(
            IUnitOfWork unitOfWork,
            ICurrentTenantService tenantService,
            IPasswordHasher passwordHasher)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
            _passwordHasher = passwordHasher;
        }

        public async Task<IDataResult<StaffResponseDto>> CreateStaffAsync(CreateStaffRequestDto request, CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<StaffResponseDto>.Fail("İşletme yetkiniz bulunamadı.", 403);
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
                    var defaultPassword = "Staff@" + Guid.NewGuid().ToString("N")[..6];
                    var passwordHash = _passwordHasher.HashPassword(defaultPassword);

                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        FirstName = request.FirstName.Trim(),
                        LastName = request.LastName.Trim(),
                        Email = emailTrimmed,
                        NormalizedEmail = emailNormalized,
                        PhoneNumber = request.PhoneNumber.Trim(),
                        PasswordHash = passwordHash,
                        IsActive = true
                    };
                    await userRepo.AddAsync(user, cancellationToken);
                }

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
                        UserId = user.Id
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
                    return DataResult<StaffResponseDto>.Fail("Bu çalışan için zaten bir profil oluşturulmuş.", 400);
                }

                var staffProfile = new StaffProfile
                {
                    Id = Guid.NewGuid(),
                    BusinessMemberId = member.Id,
                    Biography = request.Biography?.Trim(),
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
                    foreach (var branchId in validBranchIds)
                    {
                        await assignmentRepo.AddAsync(new StaffBranchAssignment
                        {
                            StaffProfileId = staffProfile.Id,
                            BranchId = branchId,
                            AssignedAt = DateTimeOffset.UtcNow
                        }, cancellationToken);
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

            assignmentRepo.RemoveRange(existingAssignments);

            if (request.BranchIds.Count > 0)
            {
                var branchRepo = _unitOfWork.Repository<Branch>();
                var validBranchIds = await branchRepo.Query()
                    .Where(b => b.BusinessId == businessId.Value && request.BranchIds.Contains(b.Id))
                    .Select(b => b.Id)
                    .ToListAsync(cancellationToken);

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

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Ok("Şube atamaları başarıyla güncellendi.");
        }

        public async Task<IDataResult<IReadOnlyList<StaffResponseDto>>> GetBusinessStaffAsync(CancellationToken cancellationToken = default)
        {
            var businessId = _tenantService.BusinessId;
            if (!businessId.HasValue)
            {
                return DataResult<IReadOnlyList<StaffResponseDto>>.Fail("İşletme yetkiniz bulunamadı.", 403);
            }

            var staffList = await _unitOfWork.Repository<StaffProfile>().Query()
                .Include(sp => sp.BusinessMember)
                    .ThenInclude(bm => bm.User)
                .Include(sp => sp.BranchAssignments)
                .Where(sp => sp.BusinessMember.BusinessId == businessId.Value)
                .ToListAsync(cancellationToken);

            var response = staffList.Select(sp => new StaffResponseDto
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
                AssignedBranchIds = sp.BranchAssignments.Select(ba => ba.BranchId).ToList()
            }).ToList();

            return DataResult<IReadOnlyList<StaffResponseDto>>.Ok(response);
        }

        public async Task<IDataResult<IReadOnlyList<StaffResponseDto>>> GetBranchStaffAsync(Guid branchId, CancellationToken cancellationToken = default)
        {
            var assignments = await _unitOfWork.Repository<StaffBranchAssignment>().Query()
                .Include(a => a.StaffProfile)
                    .ThenInclude(sp => sp.BusinessMember)
                        .ThenInclude(bm => bm.User)
                .Where(a => a.BranchId == branchId && a.StaffProfile.IsBookable)
                .ToListAsync(cancellationToken);

            var response = assignments.Select(a => new StaffResponseDto
            {
                Id = a.StaffProfile.Id,
                BusinessMemberId = a.StaffProfile.BusinessMemberId,
                UserId = a.StaffProfile.BusinessMember.UserId,
                BusinessId = a.StaffProfile.BusinessMember.BusinessId,
                FullName = $"{a.StaffProfile.BusinessMember.User.FirstName} {a.StaffProfile.BusinessMember.User.LastName}",
                Email = a.StaffProfile.BusinessMember.User.Email,
                PhoneNumber = a.StaffProfile.BusinessMember.User.PhoneNumber,
                Biography = a.StaffProfile.Biography,
                ProfileImageUrl = a.StaffProfile.ProfileImageUrl,
                IsBookable = a.StaffProfile.IsBookable,
                AssignedBranchIds = new List<Guid> { a.BranchId }
            }).ToList();

            return DataResult<IReadOnlyList<StaffResponseDto>>.Ok(response);
        }
    }
}