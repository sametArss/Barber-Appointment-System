
using BarberBooking.Entities.Common;

namespace BarberBooking.Entities.Businesses
{
    public class Business : BaseEntity
    {
        public required string Name { get; set; }

        public string? Description { get; set; }

        public required string PhoneNumber { get; set; }

        public string? Email { get; set; }

        public string? WebsiteUrl { get; set; }

        public string? LogoUrl { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation Properties

        public ICollection<BusinessMember> Members { get; set; }
            = new HashSet<BusinessMember>();

        public ICollection<Branch> Branches { get; set; }
            = new HashSet<Branch>();
    }
}
