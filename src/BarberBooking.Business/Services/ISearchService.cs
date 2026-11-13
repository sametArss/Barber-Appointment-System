using BarberBooking.Shared.DTOs.Search;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface ISearchService
    {
        Task<IDataResult<IReadOnlyList<NearbyBranchResponseDto>>> SearchNearbyBranchesAsync(NearbyBranchesQueryDto query, CancellationToken cancellationToken = default);
        Task<IDataResult<NearbyBranchResponseDto>> GetBranchAsync(Guid branchId, CancellationToken cancellationToken = default);
    }
}
