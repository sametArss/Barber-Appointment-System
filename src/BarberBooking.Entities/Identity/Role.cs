
using BarberBooking.Entities.Common;

namespace BarberBooking.Entities.Identity
{
    public class Role : BaseEntity
    {
        public required string Name { get; set; }

        public string? Description { get; set; }

        // Navigation Properties

        public ICollection<UserRole> UserRoles { get; set; }
            = new HashSet<UserRole>();
    }
}
