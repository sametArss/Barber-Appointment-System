using BarberBooking.Shared.DTOs.Staff;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface IStaffService
    {
        Task<IDataResult<StaffResponseDto>> CreateStaffAsync(CreateStaffRequestDto request, CancellationToken cancellationToken = default);
        Task<IResult> AssignBranchesAsync(AssignStaffBranchesRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<StaffResponseDto>>> GetBusinessStaffAsync(CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<StaffResponseDto>>> GetBranchStaffAsync(Guid branchId, CancellationToken cancellationToken = default);
    }
}