namespace BarberBooking.Shared.DTOs.Appointments
{
    public class AvailableSlotsQueryDto
    {
        public Guid BranchId { get; set; }
        public Guid StaffProfileId { get; set; }
        public Guid ServiceId { get; set; }
        public DateOnly Date { get; set; }
    }

    public class AvailableSlotResponseDto
    {
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public DateTimeOffset StartAtUtc { get; set; }
        public DateTimeOffset EndAtUtc { get; set; }
    }

    public class CreateAppointmentRequestDto
    {
        public Guid BranchId { get; set; }
        public Guid StaffProfileId { get; set; }
        public Guid ServiceId { get; set; }
        public DateTimeOffset StartAt { get; set; }
    }

    public class CancelAppointmentRequestDto
    {
        public Guid AppointmentId { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class UpdateAppointmentStatusRequestDto
    {
        public Guid AppointmentId { get; set; }
        public int NewStatus { get; set; } // 1: Pending, 2: Confirmed, 3: Completed, 4: Cancelled, 5: NoShow
        public string? Note { get; set; }
    }

    public class AppointmentResponseDto
    {
        public Guid Id { get; set; }
        public Guid CustomerUserId { get; set; }
        public string CustomerFullName { get; set; } = string.Empty;
        public string CustomerPhoneNumber { get; set; } = string.Empty;
        public Guid BusinessId { get; set; }
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public Guid StaffProfileId { get; set; }
        public string StaffFullName { get; set; } = string.Empty;
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public DateTimeOffset StartAt { get; set; }
        public DateTimeOffset EndAt { get; set; }
        public decimal PriceSnapshot { get; set; }
        public int DurationSnapshot { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public string? CancellationReason { get; set; }
    }
}