using BarberBooking.Entities.Common;
using BarberBooking.Entities.Identity;

namespace BarberBooking.Entities.Appointments
{
    public class AppointmentStatusHistory : BaseEntity
    {
        public Guid AppointmentId { get; set; }

        public AppointmentStatus? OldStatus { get; set; }

        public AppointmentStatus NewStatus { get; set; }

        public Guid? ChangedByUserId { get; set; }

        public string? Note { get; set; }

        public Appointment Appointment { get; set; } = null!;

        public User? ChangedByUser { get; set; }
    }
}