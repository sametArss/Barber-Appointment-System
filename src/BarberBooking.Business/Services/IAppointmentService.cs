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
        Task<IDataResult<IReadOnlyList<AppointmentResponseDto>>> GetMyAppointmentsAsync(CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<AppointmentResponseDto>>> GetMyWorkAppointmentsAsync(CancellationToken cancellationToken = default);
        Task<IResult> UpdateMyWorkAppointmentStatusAsync(UpdateAppointmentStatusRequestDto request, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<AppointmentResponseDto>>> GetBranchAppointmentsAsync(Guid branchId, DateOnly? date = null, CancellationToken cancellationToken = default);
    }
}
