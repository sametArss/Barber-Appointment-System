using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Favorites;
using BarberBooking.Entities.Reviews;
using BarberBooking.Shared.DTOs.Favorites;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.Business.Services
{
    public class FavoriteManager : IFavoriteService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;

        public FavoriteManager(IUnitOfWork unitOfWork, ICurrentTenantService tenantService)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
        }

        public async Task<IDataResult<IReadOnlyList<FavoriteBranchResponseDto>>> GetMyFavoritesAsync(CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<IReadOnlyList<FavoriteBranchResponseDto>>.Fail("Oturum açmanız gerekmektedir.", 401);
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
                return DataResult<IReadOnlyList<FavoriteBranchResponseDto>>.Ok(Array.Empty<FavoriteBranchResponseDto>());
            }

            var branchIds = favorites.Select(f => f.BranchId).Distinct().ToList();

            var reviewStats = await _unitOfWork.Repository<Review>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Where(r => branchIds.Contains(r.Appointment.BranchId))
                .GroupBy(r => r.Appointment.BranchId)
                .Select(g => new
                {
                    BranchId = g.Key,
                    Count = g.Count(),
                    Average = g.Average(x => (double)x.Rating)
                })
                .ToDictionaryAsync(x => x.BranchId, cancellationToken);

            var result = favorites.Select(f =>
            {
                reviewStats.TryGetValue(f.BranchId, out var stats);

                return new FavoriteBranchResponseDto
                {
                    BranchId = f.BranchId,
                    BranchName = f.Branch.Name,
                    BusinessId = f.BusinessId,
                    BusinessName = f.Business.Name,
                    BusinessDescription = f.Business.Description,
                    Address = f.Branch.Address,
                    City = f.Branch.City,
                    District = f.Branch.District,
                    PhoneNumber = f.Business.PhoneNumber,
                    CreatedAt = f.CreatedAt,
                    AverageRating = stats != null ? Math.Round(stats.Average, 2) : 0,
                    TotalReviewCount = stats?.Count ?? 0
                };
            }).ToList();

            return DataResult<IReadOnlyList<FavoriteBranchResponseDto>>.Ok(result);
        }

        public async Task<IDataResult<IReadOnlyList<Guid>>> GetMyFavoriteBranchIdsAsync(CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<IReadOnlyList<Guid>>.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var ids = await _unitOfWork.Repository<Favorite>().QueryAsNoTracking()
                .Where(f => f.UserId == userId.Value)
                .Select(f => f.BranchId)
                .ToListAsync(cancellationToken);

            return DataResult<IReadOnlyList<Guid>>.Ok(ids);
        }

        public async Task<IDataResult<FavoriteToggleResponseDto>> ToggleFavoriteAsync(Guid branchId, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<FavoriteToggleResponseDto>.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var branch = await _unitOfWork.Repository<Branch>().QueryAsNoTracking()
                .IgnoreQueryFilters()
                .Include(b => b.Business)
                .FirstOrDefaultAsync(b => b.Id == branchId && b.IsActive && b.Business.IsActive, cancellationToken);

            if (branch == null)
            {
                return DataResult<FavoriteToggleResponseDto>.Fail("Şube bulunamadı.", 404);
            }

            var favoriteRepo = _unitOfWork.Repository<Favorite>();
            var existing = await favoriteRepo.FirstOrDefaultAsync(
                f => f.UserId == userId.Value && f.BranchId == branchId,
                cancellationToken);

            if (existing != null)
            {
                favoriteRepo.Remove(existing);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return DataResult<FavoriteToggleResponseDto>.Ok(
                    new FavoriteToggleResponseDto { BranchId = branchId, IsFavorited = false },
                    "Şube favorilerden çıkarıldı.");
            }

            await favoriteRepo.AddAsync(new Favorite
            {
                UserId = userId.Value,
                BranchId = branchId,
                BusinessId = branch.BusinessId,
                CreatedAt = DateTimeOffset.UtcNow
            }, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return DataResult<FavoriteToggleResponseDto>.Ok(
                new FavoriteToggleResponseDto { BranchId = branchId, IsFavorited = true },
                "Şube favorilerinize eklendi.");
        }

        public async Task<IResult> RemoveFavoriteAsync(Guid branchId, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var favoriteRepo = _unitOfWork.Repository<Favorite>();
            var existing = await favoriteRepo.FirstOrDefaultAsync(
                f => f.UserId == userId.Value && f.BranchId == branchId,
                cancellationToken);

            if (existing == null)
            {
                return Result.Fail("Favori kaydı bulunamadı.", 404);
            }

            favoriteRepo.Remove(existing);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Ok("Şube favorilerden çıkarıldı.");
        }
    }
}
