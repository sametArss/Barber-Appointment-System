using BarberBooking.Entities.Appointments;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Identity;

namespace BarberBooking.Entities.Customers
{
    public class CustomerPenalty : BaseEntity, ITenantEntity
    {
        public Guid CustomerUserId { get; set; }

        public Guid BusinessId { get; set; }

        public Guid? AppointmentId { get; set; }

        public PenaltyReason Reason { get; set; }

        public string? Note { get; set; }

        // Ceza ceza puanının geçerlilik süresi (örn. 90 gün)
        public DateTimeOffset ExpiresAt { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation Properties

        public User Customer { get; set; } = null!;

        public Business Business { get; set; } = null!;

        public Appointment? Appointment { get; set; }
    }

    public enum PenaltyReason
    {
        NoShow = 1,
        LateCancellation = 2,
        ManualByBusiness = 3
    }
}