using BarberBooking.Shared.DTOs.Businesses;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface IBusinessService
    {
        Task<IDataResult<BusinessResponseDto>> CreateBusinessAsync(CreateBusinessRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<BranchResponseDto>> AddBranchAsync(CreateBranchRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<BusinessResponseDto>> GetMyBusinessAsync(CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<BranchResponseDto>>> GetMyBranchesAsync(CancellationToken cancellationToken = default);
    }
}