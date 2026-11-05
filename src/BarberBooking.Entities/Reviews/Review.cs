using BarberBooking.Entities.Common;
using BarberBooking.Entities.Identity;
using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Appointments;

namespace BarberBooking.Entities.Reviews
{
    public class Review : BaseEntity
    {
        public Guid AppointmentId { get; set; }

        public Guid CustomerUserId { get; set; }

        public Guid BusinessId { get; set; }

        public int Rating { get; set; }

        public string? Comment { get; set; }

        public Appointment Appointment { get; set; } = null!;

        public User Customer { get; set; } = null!;

        public Business Business { get; set; } = null!;
    }
}