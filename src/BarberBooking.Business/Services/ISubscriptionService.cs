using BarberBooking.Shared.DTOs.Subscriptions;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface ISubscriptionService
    {
        Task<IDataResult<IReadOnlyList<SubscriptionPlanDto>>> GetActivePlansAsync(CancellationToken cancellationToken = default);
        Task<IDataResult<BusinessSubscriptionDetailsDto>> GetCurrentSubscriptionAsync(CancellationToken cancellationToken = default);
        Task<IResult> SubscribeAsync(SubscribeRequestDto request, CancellationToken cancellationToken = default);
        Task<IResult> CancelSubscriptionAsync(string reason, CancellationToken cancellationToken = default);
        Task<IResult> CheckBranchLimitAsync(Guid businessId, CancellationToken cancellationToken = default);
        Task<IResult> CheckStaffLimitAsync(Guid businessId, Guid branchId, CancellationToken cancellationToken = default);
    }
}