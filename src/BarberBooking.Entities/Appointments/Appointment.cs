using BarberBooking.Entities.Common;
using BarberBooking.Entities.Identity;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Services;

namespace BarberBooking.Entities.Appointments
{
    public class Appointment : BaseEntity
    {
        public Guid CustomerUserId { get; set; }

        public Guid BusinessId { get; set; }

        public Guid BranchId { get; set; }

        public Guid StaffProfileId { get; set; }

        public Guid ServiceId { get; set; }

        // Randevunun başlangıç ve bitiş zamanı UTC tutulur.
        public DateTimeOffset StartAt { get; set; }

        public DateTimeOffset EndAt { get; set; }

        // Randevu oluşturulduğu andaki fiyat ve süre.
        // Hizmet fiyatı sonradan değişse bile eski randevu etkilenmez.
        public decimal PriceSnapshot { get; set; }

        public int DurationSnapshot { get; set; }

        public AppointmentStatus Status { get; set; }
            = AppointmentStatus.Pending;

        public DateTimeOffset? CancelledAt { get; set; }

        public string? CancellationReason { get; set; }

        public Guid? CancelledByUserId { get; set; }

        public User Customer { get; set; } = null!;

        public Business Business { get; set; } = null!;

        public Branch Branch { get; set; } = null!;

        public StaffProfile StaffProfile { get; set; } = null!;

        public Service Service { get; set; } = null!;

        public ICollection<AppointmentStatusHistory> StatusHistory { get; set; }
            = new HashSet<AppointmentStatusHistory>();
    }

    public enum AppointmentStatus
    {
        Pending = 1,
        Confirmed = 2,
        Completed = 3,
        Cancelled = 4,
        NoShow = 5
    }
}