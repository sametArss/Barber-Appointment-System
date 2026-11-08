using BarberBooking.Shared.DTOs.Scheduling;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface IScheduleService
    {
        // Branch Working Hours & Exceptions
        Task<IResult> SetBranchWorkingHoursAsync(SetBranchWorkingHoursRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<WorkingHourResponseDto>>> GetBranchWorkingHoursAsync(Guid branchId, CancellationToken cancellationToken = default);
        Task<IResult> AddBranchExceptionAsync(CreateBranchExceptionRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<ScheduleExceptionResponseDto>>> GetBranchExceptionsAsync(Guid branchId, CancellationToken cancellationToken = default);

        // Staff Working Hours & Exceptions
        Task<IResult> SetStaffWorkingHoursAsync(SetStaffWorkingHoursRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<WorkingHourResponseDto>>> GetStaffWorkingHoursAsync(Guid staffProfileId, Guid branchId, CancellationToken cancellationToken = default);
        Task<IResult> AddStaffExceptionAsync(CreateStaffExceptionRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<ScheduleExceptionResponseDto>>> GetStaffExceptionsAsync(Guid staffProfileId, Guid branchId, CancellationToken cancellationToken = default);
    }
}