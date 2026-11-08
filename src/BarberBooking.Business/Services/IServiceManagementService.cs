using BarberBooking.Shared.DTOs.Services;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface IServiceManagementService
    {
        Task<IDataResult<ServiceResponseDto>> CreateServiceAsync(CreateServiceRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<ServiceResponseDto>> UpdateServiceAsync(UpdateServiceRequestDto request, CancellationToken cancellationToken = default);
        Task<IResult> DeleteServiceAsync(Guid serviceId, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<ServiceResponseDto>>> GetBusinessServicesAsync(CancellationToken cancellationToken = default);
        Task<IResult> AssignServiceToBranchAsync(AssignBranchServiceRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<BranchServiceResponseDto>>> GetBranchServicesAsync(Guid branchId, CancellationToken cancellationToken = default);
        Task<IResult> AssignServicesToStaffAsync(AssignStaffServicesRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<ServiceResponseDto>>> GetStaffServicesAsync(Guid staffProfileId, CancellationToken cancellationToken = default);
    }
}