using BarberBooking.Entities.Identity;
using BarberBooking.Shared.DTOs.Auth;

namespace BarberBooking.Business.Security
{
    public interface ITokenService
    {
        AuthResponseDto CreateToken(User user, IEnumerable<string> roles, Guid? businessId = null);
        string GenerateRefreshToken();
    }
}