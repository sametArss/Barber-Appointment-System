
using BarberBooking.Entities.Common;

namespace BarberBooking.Entities.Identity
{
    public class RefreshToken : BaseEntity
    {
        public Guid UserId { get; set; }

        public required string TokenHash { get; set; }

        public DateTimeOffset ExpiresAt { get; set; }

        public DateTimeOffset? RevokedAt { get; set; }

        public string? ReplacedByTokenHash { get; set; }

        // Navigation Properties

        public User User { get; set; } = null!;
    }
}
