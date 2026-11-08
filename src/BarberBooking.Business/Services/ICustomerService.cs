using BarberBooking.Shared.DTOs.Customer;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface ICustomerService
    {
        Task<IDataResult<CustomerProfileResponseDto>> GetMyProfileAsync(CancellationToken cancellationToken = default);
        Task<IResult> UpdateProfileAsync(UpdateProfileRequestDto request, CancellationToken cancellationToken = default);
        Task<IResult> ChangePasswordAsync(ChangePasswordRequestDto request, CancellationToken cancellationToken = default);
        Task<IResult> ToggleFavoriteAsync(Guid businessId, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<FavoriteBusinessResponseDto>>> GetMyFavoritesAsync(CancellationToken cancellationToken = default);
    }
}