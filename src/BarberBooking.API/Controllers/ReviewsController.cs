using BarberBooking.Business.Services;
using BarberBooking.Shared.DTOs.Reviews;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewsController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _reviewService.CreateReviewAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("branch/{branchId:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBranchReviews(
            [FromRoute] Guid branchId,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 30,
            CancellationToken cancellationToken = default)
        {
            var result = await _reviewService.GetBranchReviewsAsync(branchId, skip, take, cancellationToken);
            return Ok(result);
        }

        [HttpGet("staff/{staffProfileId:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStaffReviews(
            [FromRoute] Guid staffProfileId,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 30,
            CancellationToken cancellationToken = default)
        {
            var result = await _reviewService.GetStaffReviewsAsync(staffProfileId, skip, take, cancellationToken);
            return Ok(result);
        }

        [HttpGet("business/{businessId:guid}/summary")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBusinessSummary([FromRoute] Guid businessId, CancellationToken cancellationToken)
        {
            var result = await _reviewService.GetBusinessReviewSummaryAsync(businessId, cancellationToken);
            return Ok(result);
        }
    }
}