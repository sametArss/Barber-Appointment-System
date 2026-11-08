using BarberBooking.Shared.DTOs.Customers;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface IPenaltyService
    {
        Task<IResult> AddPenaltyAsync(CreatePenaltyRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<CustomerPenaltyStatusDto>> CheckCustomerRestrictionAsync(Guid customerUserId, Guid businessId, CancellationToken cancellationToken = default);
        Task<IDataResult<CustomerPenaltyStatusDto>> GetMyPenaltyStatusAsync(Guid businessId, CancellationToken cancellationToken = default);
        Task<IResult> ForgivePenaltyAsync(Guid penaltyId, CancellationToken cancellationToken = default);
    }
}