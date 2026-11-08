using BarberBooking.Business.Security;
using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Appointments;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Customers;
using BarberBooking.Entities.Favorites;
using BarberBooking.Entities.Identity;
using BarberBooking.Entities.Reviews;
using BarberBooking.Shared.DTOs.Customer;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;
using BusinessEntity = BarberBooking.Entities.Businesses.Business;

namespace BarberBooking.Business.Services
{
    public class CustomerManager : ICustomerService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;
        private readonly IPasswordHasher _passwordHasher;

        public CustomerManager(
            IUnitOfWork unitOfWork,
            ICurrentTenantService tenantService,
            IPasswordHasher passwordHasher)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
            _passwordHasher = passwordHasher;
        }

        public async Task<IDataResult<CustomerProfileResponseDto>> GetMyProfileAsync(CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<CustomerProfileResponseDto>.Fail("Oturum açmanýz gerekmektedir.", 401);
            }

            var user = await _unitOfWork.Repository<User>().GetByIdAsync(userId.Value, cancellationToken);
            if (user == null)
            {
                return DataResult<CustomerProfileResponseDto>.Fail("Kullanýcý bulunamadý.", 404);
            }

            var appointments = await _unitOfWork.Repository<Appointment>().GetAsync(
                a => a.CustomerUserId == userId.Value,
                cancellationToken);

            var now = DateTimeOffset.UtcNow;
            var activePenalties = await _unitOfWork.Repository<CustomerPenalty>().CountAsync(
                p => p.CustomerUserId == userId.Value && p.IsActive && p.ExpiresAt > now,
                cancellationToken);

            var response = new CustomerProfileResponseDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                TotalAppointments = appointments.Count,
                CompletedAppointments = appointments.Count(a => a.Status == AppointmentStatus.Completed),
                ActivePenalties = activePenalties,
                IsRestricted = activePenalties >= 3
            };

            return DataResult<CustomerProfileResponseDto>.Ok(response);
        }

        public async Task<IResult> UpdateProfileAsync(UpdateProfileRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanýz gerekmektedir.", 401);
            }

            var userRepo = _unitOfWork.Repository<User>();
            var user = await userRepo.GetByIdAsync(userId.Value, cancellationToken);
            if (user == null)
            {
                return Result.Fail("Kullanýcý bulunamadý.", 404);
            }

            user.FirstName = request.FirstName.Trim();
            user.LastName = request.LastName.Trim();
            user.PhoneNumber = request.PhoneNumber.Trim();

            userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Profil bilgileriniz baþarýyla güncellendi.");
        }

        public async Task<IResult> ChangePasswordAsync(ChangePasswordRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanýz gerekmektedir.", 401);
            }

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            {
                return Result.Fail("Yeni þifre en az 6 karakter olmalýdýr.", 400);
            }

            var userRepo = _unitOfWork.Repository<User>();
            var user = await userRepo.GetByIdAsync(userId.Value, cancellationToken);
            if (user == null)
            {
                return Result.Fail("Kullanýcý bulunamadý.", 404);
            }

            if (!_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                return Result.Fail("Mevcut þifreniz hatalý.", 400);
            }

            user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
            userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Þifreniz baþarýyla deðiþtirildi.");
        }

        public async Task<IResult> ToggleFavoriteAsync(Guid businessId, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanýz gerekmektedir.", 401);
            }

            var businessExists = await _unitOfWork.Repository<BusinessEntity>().AnyAsync(
                b => b.Id == businessId && b.IsActive,
                cancellationToken);

            if (!businessExists)
            {
                return Result.Fail("Ýþletme bulunamadý.", 404);
            }

            var favoriteRepo = _unitOfWork.Repository<Favorite>();
            var existingFavorite = await favoriteRepo.FirstOrDefaultAsync(
                f => f.UserId == userId.Value && f.BusinessId == businessId,
                cancellationToken);

            if (existingFavorite != null)
            {
                favoriteRepo.Remove(existingFavorite);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                return Result.Ok("Ýþletme favorilerden çýkarýldý.");
            }

            var favorite = new Favorite
            {
                UserId = userId.Value,
                BusinessId = businessId,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await favoriteRepo.AddAsync(favorite, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Ýþletme favorilere eklendi.");
        }

        public async Task<IDataResult<IReadOnlyList<FavoriteBusinessResponseDto>>> GetMyFavoritesAsync(CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<IReadOnlyList<FavoriteBusinessResponseDto>>.Fail("Oturum açmanýz gerekmektedir.", 401);
            }

            var favorites = await _unitOfWork.Repository<Favorite>().Query()
                .Include(f => f.Business)
                    .ThenInclude(b => b.Branches)
                .Where(f => f.UserId == userId.Value && f.Business.IsActive)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync(cancellationToken);

            var businessIds = favorites.Select(f => f.BusinessId).ToList();

            var reviews = await _unitOfWork.Repository<Review>().Query()
                .Where(r => businessIds.Contains(r.BusinessId))
                .Select(r => new { r.BusinessId, r.Rating })
                .ToListAsync(cancellationToken);

            var reviewLookup = reviews
                .GroupBy(r => r.BusinessId)
                .ToDictionary(
                    g => g.Key,
                    g => new { Avg = Math.Round(g.Average(x => x.Rating), 1), Count = g.Count() });

            var response = favorites.Select(f =>
            {
                reviewLookup.TryGetValue(f.BusinessId, out var stats);

                return new FavoriteBusinessResponseDto
                {
                    BusinessId = f.BusinessId,
                    BusinessName = f.Business.Name,
                    Description = f.Business.Description,
                    PhoneNumber = f.Business.PhoneNumber,
                    AverageRating = stats?.Avg ?? 0.0,
                    TotalReviews = stats?.Count ?? 0,
                    BranchCount = f.Business.Branches.Count(br => br.IsActive),
                    AddedAt = f.CreatedAt
                };
            }).ToList();

            return DataResult<IReadOnlyList<FavoriteBusinessResponseDto>>.Ok(response);
        }
    }
}