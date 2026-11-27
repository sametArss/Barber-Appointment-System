using BarberBooking.Shared.DTOs.Favorites;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface IFavoriteService
    {
        Task<IDataResult<IReadOnlyList<FavoriteBranchResponseDto>>> GetMyFavoritesAsync(CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<Guid>>> GetMyFavoriteBranchIdsAsync(CancellationToken cancellationToken = default);
        Task<IDataResult<FavoriteToggleResponseDto>> ToggleFavoriteAsync(Guid branchId, CancellationToken cancellationToken = default);
        Task<IResult> RemoveFavoriteAsync(Guid branchId, CancellationToken cancellationToken = default);
    }
}
