using BarberBooking.Business.Services;
using BarberBooking.Shared.DTOs.Reporting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "BusinessOwner,BusinessManager")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportingService _reportingService;

        public ReportsController(IReportingService reportingService)
        {
            _reportingService = reportingService;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardSummary([FromQuery] DashboardSummaryQueryDto query, CancellationToken cancellationToken)
        {
            var result = await _reportingService.GetDashboardSummaryAsync(query, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }
    }
}