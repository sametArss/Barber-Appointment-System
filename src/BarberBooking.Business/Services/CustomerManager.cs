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
                return DataResult<CustomerProfileResponseDto>.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var user = await _unitOfWork.Repository<User>().GetByIdAsync(userId.Value, cancellationToken);
            if (user == null)
            {
                return DataResult<CustomerProfileResponseDto>.Fail("Kullanıcı bulunamadı.", 404);
            }

            // SQL-side randevu sayımı (tüm randevuları RAM'e çekmez)
            var apptQuery = _unitOfWork.Repository<Appointment>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(a => a.CustomerUserId == userId.Value);

            var totalAppointments = await apptQuery.CountAsync(cancellationToken);
            var completedAppointments = await apptQuery.CountAsync(a => a.Status == AppointmentStatus.Completed, cancellationToken);

            var now = DateTimeOffset.UtcNow;
            var activePenalties = await _unitOfWork.Repository<CustomerPenalty>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .CountAsync(p => p.CustomerUserId == userId.Value && p.IsActive && p.ExpiresAt > now, cancellationToken);

            var response = new CustomerProfileResponseDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                TotalAppointments = totalAppointments,
                CompletedAppointments = completedAppointments,
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
                return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var userRepo = _unitOfWork.Repository<User>();
            var user = await userRepo.GetByIdAsync(userId.Value, cancellationToken);
            if (user == null)
            {
                return Result.Fail("Kullanıcı bulunamadı.", 404);
            }

            user.FirstName = request.FirstName.Trim();
            user.LastName = request.LastName.Trim();
            user.PhoneNumber = request.PhoneNumber.Trim();

            userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Profil bilgileriniz başarıyla güncellendi.");
        }

        public async Task<IResult> ChangePasswordAsync(ChangePasswordRequestDto request, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            {
                return Result.Fail("Yeni şifre en az 6 karakter olmalıdır.", 400);
            }

            var userRepo = _unitOfWork.Repository<User>();
            var user = await userRepo.GetByIdAsync(userId.Value, cancellationToken);
            if (user == null)
            {
                return Result.Fail("Kullanıcı bulunamadı.", 404);
            }

            if (!_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                return Result.Fail("Mevcut şifreniz hatalı.", 400);
            }

            user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
            userRepo.Update(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Güvenlik: Şifre değiştiğinde tüm cihazlardaki aktif refresh token'ları iptal et
            var nowUtc = DateTime.UtcNow;
            await _unitOfWork.Repository<RefreshToken>().Query()
                .Where(rt => rt.UserId == userId.Value && rt.RevokedAt == null)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(rt => rt.RevokedAt, nowUtc),
                    cancellationToken);

            return Result.Ok("Şifreniz başarıyla değiştirildi.");
        }

        public async Task<IResult> ToggleFavoriteAsync(Guid branchId, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var branch = await _unitOfWork.Repository<Entities.Businesses.Branch>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Include(b => b.Business)
                .FirstOrDefaultAsync(b => b.Id == branchId && b.IsActive && b.Business.IsActive, cancellationToken);

            if (branch == null)
            {
                return Result.Fail("Şube bulunamadı.", 404);
            }

            var favoriteRepo = _unitOfWork.Repository<Favorite>();
            var existingFavorite = await favoriteRepo.FirstOrDefaultAsync(
                f => f.UserId == userId.Value && f.BranchId == branchId,
                cancellationToken);

            if (existingFavorite != null)
            {
                favoriteRepo.Remove(existingFavorite);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                return Result.Ok("Şube favorilerden çıkarıldı.");
            }

            var favorite = new Favorite
            {
                UserId = userId.Value,
                BranchId = branchId,
                BusinessId = branch.BusinessId,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await favoriteRepo.AddAsync(favorite, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Şube favorilere eklendi.");
        }

        public async Task<IDataResult<IReadOnlyList<FavoriteBusinessResponseDto>>> GetMyFavoritesAsync(CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<IReadOnlyList<FavoriteBusinessResponseDto>>.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var favorites = await _unitOfWork.Repository<Favorite>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Include(f => f.Branch)
                .Include(f => f.Business)
                .Where(f => f.UserId == userId.Value && f.Branch.IsActive && f.Business.IsActive)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync(cancellationToken);

            if (favorites.Count == 0)
            {
                return DataResult<IReadOnlyList<FavoriteBusinessResponseDto>>.Ok(Array.Empty<FavoriteBusinessResponseDto>());
            }

            var branchIds = favorites.Select(f => f.BranchId).Distinct().ToList();

            var reviewLookup = await _unitOfWork.Repository<Review>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(r => branchIds.Contains(r.Appointment.BranchId))
                .GroupBy(r => r.Appointment.BranchId)
                .Select(g => new
                {
                    BranchId = g.Key,
                    Avg = g.Average(x => (double)x.Rating),
                    Count = g.Count()
                })
                .ToDictionaryAsync(x => x.BranchId, cancellationToken);

            var response = favorites.Select(f =>
            {
                reviewLookup.TryGetValue(f.BranchId, out var stats);

                return new FavoriteBusinessResponseDto
                {
                    BusinessId = f.BusinessId,
                    BusinessName = $"{f.Business.Name} — {f.Branch.Name}",
                    Description = f.Business.Description,
                    PhoneNumber = f.Business.PhoneNumber,
                    AverageRating = stats != null ? Math.Round(stats.Avg, 1) : 0.0,
                    TotalReviews = stats?.Count ?? 0,
                    BranchCount = 1,
                    AddedAt = f.CreatedAt
                };
            }).ToList();

            return DataResult<IReadOnlyList<FavoriteBusinessResponseDto>>.Ok(response);
        }
    }
}