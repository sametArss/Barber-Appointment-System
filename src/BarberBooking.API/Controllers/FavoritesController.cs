using BarberBooking.Business.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FavoritesController : ControllerBase
    {
        private readonly IFavoriteService _favoriteService;

        public FavoritesController(IFavoriteService favoriteService)
        {
            _favoriteService = favoriteService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyFavorites(CancellationToken cancellationToken)
        {
            var result = await _favoriteService.GetMyFavoritesAsync(cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("ids")]
        public async Task<IActionResult> GetMyFavoriteBranchIds(CancellationToken cancellationToken)
        {
            var result = await _favoriteService.GetMyFavoriteBranchIdsAsync(cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("toggle/{branchId:guid}")]
        public async Task<IActionResult> ToggleFavorite([FromRoute] Guid branchId, CancellationToken cancellationToken)
        {
            var result = await _favoriteService.ToggleFavoriteAsync(branchId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpDelete("{branchId:guid}")]
        public async Task<IActionResult> RemoveFavorite([FromRoute] Guid branchId, CancellationToken cancellationToken)
        {
            var result = await _favoriteService.RemoveFavoriteAsync(branchId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }
    }
}
