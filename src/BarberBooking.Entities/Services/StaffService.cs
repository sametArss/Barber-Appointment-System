
using BarberBooking.Entities.Businesses;

namespace BarberBooking.Entities.Services
{
    public class StaffService
    {
        public Guid StaffProfileId { get; set; }

        public Guid ServiceId { get; set; }

        // Navigation Properties

        public StaffProfile StaffProfile { get; set; } = null!;

        public Service Service { get; set; } = null!;
    }
}
