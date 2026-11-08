using BarberBooking.Shared.DTOs.Reviews;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface IReviewService
    {
        Task<IDataResult<ReviewResponseDto>> CreateReviewAsync(CreateReviewRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<ReviewResponseDto>>> GetBranchReviewsAsync(Guid branchId, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<ReviewResponseDto>>> GetStaffReviewsAsync(Guid staffProfileId, CancellationToken cancellationToken = default);
        Task<IDataResult<BusinessReviewSummaryDto>> GetBusinessReviewSummaryAsync(Guid businessId, CancellationToken cancellationToken = default);
    }
}