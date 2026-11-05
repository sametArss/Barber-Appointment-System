
using BarberBooking.Entities.Common;

namespace BarberBooking.Entities.Identity
{
    public class User : BaseEntity
    {
        public required string FirstName { get; set; }

        public required string LastName { get; set; }

        public required string Email { get; set; }

        public required string NormalizedEmail { get; set; }

        public required string PasswordHash { get; set; }

        public string? PhoneNumber { get; set; }

        public string? NormalizedPhoneNumber { get; set; }

        public bool IsEmailVerified { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public int FailedLoginAttempts { get; set; } = 0;

        public DateTimeOffset? LockoutEnd { get; set; }

        // Navigation Properties

        public ICollection<UserRole> UserRoles { get; set; }
            = new HashSet<UserRole>();

        public ICollection<RefreshToken> RefreshTokens { get; set; }
            = new HashSet<RefreshToken>();
    }
}
