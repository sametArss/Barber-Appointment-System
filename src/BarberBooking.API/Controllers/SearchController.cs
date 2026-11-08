using BarberBooking.Business.Services;
using BarberBooking.Shared.DTOs.Search;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SearchController : ControllerBase
    {
        private readonly ISearchService _searchService;

        public SearchController(ISearchService searchService)
        {
            _searchService = searchService;
        }

        [HttpGet("nearby")]
        [AllowAnonymous]
        public async Task<IActionResult> GetNearbyBranches([FromQuery] NearbyBranchesQueryDto query, CancellationToken cancellationToken)
        {
            var result = await _searchService.SearchNearbyBranchesAsync(query, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }
    }
}