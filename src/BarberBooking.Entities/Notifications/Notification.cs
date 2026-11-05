using BarberBooking.Entities.Common;
using BarberBooking.Entities.Identity;

namespace BarberBooking.Entities.Notifications
{
    public class Notification : BaseEntity
    {
        public Guid UserId { get; set; }

        public NotificationType Type { get; set; }

        public required string Title { get; set; }

        public required string Message { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTimeOffset? ReadAt { get; set; }

        // İlgili randevu veya başka bir kayda referans.
        public Guid? RelatedEntityId { get; set; }

        public User User { get; set; } = null!;
    }

    public enum NotificationType
    {
        General = 1,
        AppointmentCreated = 2,
        AppointmentConfirmed = 3,
        AppointmentCancelled = 4,
        AppointmentReminder = 5,
        AppointmentCompleted = 6,
        ReviewReceived = 7
    }
}