
namespace BarberBooking.Entities.Identity
{
    public class UserRole
    {
        public Guid UserId { get; set; }

        public Guid RoleId { get; set; }

        // Navigation Properties

        public User User { get; set; } = null!;

        public Role Role { get; set; } = null!;
    }
}
