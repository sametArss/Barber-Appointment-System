using BarberBooking.Shared.DTOs.Auth;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface IAuthService
    {
        Task<IDataResult<AuthResponseDto>> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<AuthResponseDto>> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<AuthResponseDto>> RefreshTokenAsync(RefreshTokenRequestDto request, CancellationToken cancellationToken = default);
    }
}