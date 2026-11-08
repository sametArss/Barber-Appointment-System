namespace BarberBooking.Shared.DTOs.Customers
{
    public class CreatePenaltyRequestDto
    {
        public Guid CustomerUserId { get; set; }
        public Guid? AppointmentId { get; set; }
        public int Reason { get; set; } // 1: NoShow, 2: LateCancellation, 3: ManualByBusiness
        public string? Note { get; set; }
    }

    public class CustomerPenaltyStatusDto
    {
        public Guid CustomerUserId { get; set; }
        public int ActivePenaltyCount { get; set; }
        public bool IsRestricted { get; set; }
        public DateTimeOffset? RestrictionExpiresAt { get; set; }
        public string? RestrictionMessage { get; set; }
        public List<PenaltyItemDto> Penalties { get; set; } = new();
    }

    public class PenaltyItemDto
    {
        public Guid Id { get; set; }
        public Guid BusinessId { get; set; }
        public Guid? AppointmentId { get; set; }
        public string ReasonName { get; set; } = string.Empty;
        public string? Note { get; set; }
        public DateTimeOffset CreatedDate { get; set; }
        public DateTimeOffset ExpiresAt { get; set; }
    }
}