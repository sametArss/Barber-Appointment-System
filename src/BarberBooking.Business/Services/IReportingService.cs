using BarberBooking.Shared.DTOs.Reporting;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface IReportingService
    {
        Task<IDataResult<DashboardSummaryResponseDto>> GetDashboardSummaryAsync(DashboardSummaryQueryDto query, CancellationToken cancellationToken = default);
    }
}