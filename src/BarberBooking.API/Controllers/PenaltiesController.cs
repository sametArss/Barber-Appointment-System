using BarberBooking.Business.Services;
using BarberBooking.Shared.DTOs.Customers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PenaltiesController : ControllerBase
    {
        private readonly IPenaltyService _penaltyService;

        public PenaltiesController(IPenaltyService penaltyService)
        {
            _penaltyService = penaltyService;
        }

        [HttpPost]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> AddPenalty([FromBody] CreatePenaltyRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _penaltyService.AddPenaltyAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("my-status/{businessId:guid}")]
        public async Task<IActionResult> GetMyStatus([FromRoute] Guid businessId, CancellationToken cancellationToken)
        {
            var result = await _penaltyService.GetMyPenaltyStatusAsync(businessId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("forgive/{penaltyId:guid}")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> ForgivePenalty([FromRoute] Guid penaltyId, CancellationToken cancellationToken)
        {
            var result = await _penaltyService.ForgivePenaltyAsync(penaltyId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }
    }
}