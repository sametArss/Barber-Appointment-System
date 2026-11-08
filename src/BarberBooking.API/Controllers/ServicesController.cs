using BarberBooking.Business.Services;
using BarberBooking.Shared.DTOs.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ServicesController : ControllerBase
    {
        private readonly IServiceManagementService _serviceManagementService;

        public ServicesController(IServiceManagementService serviceManagementService)
        {
            _serviceManagementService = serviceManagementService;
        }

        [HttpPost]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> CreateService([FromBody] CreateServiceRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _serviceManagementService.CreateServiceAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPut]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> UpdateService([FromBody] UpdateServiceRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _serviceManagementService.UpdateServiceAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> DeleteService([FromRoute] Guid id, CancellationToken cancellationToken)
        {
            var result = await _serviceManagementService.DeleteServiceAsync(id, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("my-business")]
        [Authorize(Roles = "BusinessOwner,BusinessManager,Employee")]
        public async Task<IActionResult> GetBusinessServices(CancellationToken cancellationToken)
        {
            var result = await _serviceManagementService.GetBusinessServicesAsync(cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("assign-branch")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> AssignToBranch([FromBody] AssignBranchServiceRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _serviceManagementService.AssignServiceToBranchAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("branch/{branchId:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBranchServices([FromRoute] Guid branchId, CancellationToken cancellationToken)
        {
            var result = await _serviceManagementService.GetBranchServicesAsync(branchId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("assign-staff")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> AssignToStaff([FromBody] AssignStaffServicesRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _serviceManagementService.AssignServicesToStaffAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("staff/{staffProfileId:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStaffServices([FromRoute] Guid staffProfileId, CancellationToken cancellationToken)
        {
            var result = await _serviceManagementService.GetStaffServicesAsync(staffProfileId, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }
    }
}