using BarberBooking.Shared.DTOs.Appointments;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface IAppointmentService
    {
        Task<IDataResult<IReadOnlyList<AvailableSlotResponseDto>>> GetAvailableSlotsAsync(AvailableSlotsQueryDto query, CancellationToken cancellationToken = default);
        Task<IDataResult<AppointmentResponseDto>> CreateAppointmentAsync(CreateAppointmentRequestDto request, CancellationToken cancellationToken = default);
        Task<IResult> CancelAppointmentAsync(CancelAppointmentRequestDto request, CancellationToken cancellationToken = default);
        Task<IResult> UpdateStatusAsync(UpdateAppointmentStatusRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<AppointmentResponseDto>>> GetMyAppointmentsAsync(int skip = 0, int take = 20, int? status = null, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<AppointmentResponseDto>>> GetMyWorkAppointmentsAsync(int skip = 0, int take = 50, int? status = null, CancellationToken cancellationToken = default);
        Task<IResult> UpdateMyWorkAppointmentStatusAsync(UpdateAppointmentStatusRequestDto request, CancellationToken cancellationToken = default);
        Task<IResult> ProposeRescheduleAsync(ProposeRescheduleRequestDto request, CancellationToken cancellationToken = default);
        Task<IResult> RespondToRescheduleAsync(RespondRescheduleRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<AppointmentResponseDto>>> GetBranchAppointmentsAsync(Guid branchId, DateOnly? date = null, CancellationToken cancellationToken = default);
    }
}
