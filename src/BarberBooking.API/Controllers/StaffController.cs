using BarberBooking.Business.Services;
using BarberBooking.Shared.DTOs.Staff;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StaffController : ControllerBase
    {
        private readonly IStaffService _staffService;

        public StaffController(IStaffService staffService)
        {
            _staffService = staffService;
        }

        [HttpPost]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> CreateStaff([FromBody] CreateStaffRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _staffService.CreateStaffAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("assign-branches")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> AssignBranches([FromBody] AssignStaffBranchesRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _staffService.AssignBranchesAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> GetBusinessStaff(CancellationToken cancellationToken)
        {
            var result = await _staffService.GetBusinessStaffAsync(cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("branch/{branchId:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBranchStaff([FromRoute] Guid branchId, CancellationToken cancellationToken)
        {
            var result = await _staffService.GetBranchStaffAsync(branchId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }
    }
}