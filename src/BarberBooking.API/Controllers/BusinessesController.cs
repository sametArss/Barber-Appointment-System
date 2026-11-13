using BarberBooking.Business.Services;
using BarberBooking.Shared.DTOs.Businesses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BusinessesController : ControllerBase
    {
        private readonly IBusinessService _businessService;

        public BusinessesController(IBusinessService businessService)
        {
            _businessService = businessService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateBusiness([FromBody] CreateBusinessRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _businessService.CreateBusinessAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("branches")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> AddBranch([FromBody] CreateBranchRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _businessService.AddBranchAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPut("branches")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> UpdateBranch([FromBody] UpdateBranchRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _businessService.UpdateBranchAsync(request, cancellationToken);
            if (!result.Success) return StatusCode(result.StatusCode, result);
            return Ok(result);
        }

        [HttpPut("me")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> UpdateMyBusiness([FromBody] UpdateBusinessRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _businessService.UpdateMyBusinessAsync(request, cancellationToken);
            if (!result.Success) return StatusCode(result.StatusCode, result);
            return Ok(result);
        }

        [HttpGet("me")]
        [Authorize(Roles = "BusinessOwner,BusinessManager,Employee")]
        public async Task<IActionResult> GetMyBusiness(CancellationToken cancellationToken)
        {
            var result = await _businessService.GetMyBusinessAsync(cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("me/branches")]
        [Authorize(Roles = "BusinessOwner,BusinessManager,Employee")]
        public async Task<IActionResult> GetMyBranches(CancellationToken cancellationToken)
        {
            var result = await _businessService.GetMyBranchesAsync(cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }
    }
}
