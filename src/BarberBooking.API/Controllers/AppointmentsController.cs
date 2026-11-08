using BarberBooking.Business.Services;
using BarberBooking.Shared.DTOs.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AppointmentsController : ControllerBase
    {
        private readonly IAppointmentService _appointmentService;

        public AppointmentsController(IAppointmentService appointmentService)
        {
            _appointmentService = appointmentService;
        }

        [HttpGet("available-slots")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAvailableSlots([FromQuery] AvailableSlotsQueryDto query, CancellationToken cancellationToken)
        {
            var result = await _appointmentService.GetAvailableSlotsAsync(query, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateAppointment([FromBody] CreateAppointmentRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _appointmentService.CreateAppointmentAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("cancel")]
        public async Task<IActionResult> CancelAppointment([FromBody] CancelAppointmentRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _appointmentService.CancelAppointmentAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPatch("status")]
        [Authorize(Roles = "BusinessOwner,BusinessManager,Employee")]
        public async Task<IActionResult> UpdateStatus([FromBody] UpdateAppointmentStatusRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _appointmentService.UpdateStatusAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("my-appointments")]
        public async Task<IActionResult> GetMyAppointments(CancellationToken cancellationToken)
        {
            var result = await _appointmentService.GetMyAppointmentsAsync(cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpGet("branch/{branchId:guid}")]
        [Authorize(Roles = "BusinessOwner,BusinessManager,Employee")]
        public async Task<IActionResult> GetBranchAppointments([FromRoute] Guid branchId, [FromQuery] DateOnly? date, CancellationToken cancellationToken)
        {
            var result = await _appointmentService.GetBranchAppointmentsAsync(branchId, date, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }
    }
}