using BarberBooking.Business.Services;
using BarberBooking.Shared.DTOs.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SchedulesController : ControllerBase
    {
        private readonly IScheduleService _scheduleService;

        public SchedulesController(IScheduleService scheduleService)
        {
            _scheduleService = scheduleService;
        }

        [HttpPost("branch-working-hours")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> SetBranchWorkingHours([FromBody] SetBranchWorkingHoursRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _scheduleService.SetBranchWorkingHoursAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("branch/{branchId:guid}/working-hours")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBranchWorkingHours([FromRoute] Guid branchId, CancellationToken cancellationToken)
        {
            var result = await _scheduleService.GetBranchWorkingHoursAsync(branchId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("branch-exception")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> AddBranchException([FromBody] CreateBranchExceptionRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _scheduleService.AddBranchExceptionAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("branch/{branchId:guid}/exceptions")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBranchExceptions([FromRoute] Guid branchId, CancellationToken cancellationToken)
        {
            var result = await _scheduleService.GetBranchExceptionsAsync(branchId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("staff-working-hours")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> SetStaffWorkingHours([FromBody] SetStaffWorkingHoursRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _scheduleService.SetStaffWorkingHoursAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("staff/{staffProfileId:guid}/branch/{branchId:guid}/working-hours")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStaffWorkingHours([FromRoute] Guid staffProfileId, [FromRoute] Guid branchId, CancellationToken cancellationToken)
        {
            var result = await _scheduleService.GetStaffWorkingHoursAsync(staffProfileId, branchId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("staff-exception")]
        [Authorize(Roles = "BusinessOwner,BusinessManager,Employee")]
        public async Task<IActionResult> AddStaffException([FromBody] CreateStaffExceptionRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _scheduleService.AddStaffExceptionAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("staff/{staffProfileId:guid}/branch/{branchId:guid}/exceptions")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStaffExceptions([FromRoute] Guid staffProfileId, [FromRoute] Guid branchId, CancellationToken cancellationToken)
        {
            var result = await _scheduleService.GetStaffExceptionsAsync(staffProfileId, branchId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }
    }
}