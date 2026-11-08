using BarberBooking.Business.Services;
using BarberBooking.Shared.DTOs.Customer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CustomersController : ControllerBase
    {
        private readonly ICustomerService _customerService;

        public CustomersController(ICustomerService customerService)
        {
            _customerService = customerService;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile(CancellationToken cancellationToken)
        {
            var result = await _customerService.GetMyProfileAsync(cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _customerService.UpdateProfileAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _customerService.ChangePasswordAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("favorites/{businessId:guid}/toggle")]
        public async Task<IActionResult> ToggleFavorite([FromRoute] Guid businessId, CancellationToken cancellationToken)
        {
            var result = await _customerService.ToggleFavoriteAsync(businessId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("favorites")]
        public async Task<IActionResult> GetMyFavorites(CancellationToken cancellationToken)
        {
            var result = await _customerService.GetMyFavoritesAsync(cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }
    }
}