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