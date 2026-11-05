
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Identity;

namespace BarberBooking.Entities.Businesses
{
    public class BusinessMember : BaseEntity
    {
        public Guid BusinessId { get; set; }

        public Guid UserId { get; set; }

        public BusinessRole Role { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset JoinedAt { get; set; }
            = DateTimeOffset.UtcNow;

        // Navigation Properties

        public Business Business { get; set; } = null!;

        public User User { get; set; } = null!;

        public StaffProfile? StaffProfile { get; set; }
    }

    public enum BusinessRole
    {
        Owner = 1,
        Manager = 2,
        Staff = 3
    }
}
