
using BarberBooking.Entities.Common;
using NetTopologySuite.Geometries;

namespace BarberBooking.Entities.Businesses
{
    public class Branch : BaseEntity
    {
        public Guid BusinessId { get; set; }

        public required string Name { get; set; }

        public required string Address { get; set; }

        public required string City { get; set; }

        public required string District { get; set; }

        public string? PostalCode { get; set; }

        public string CountryCode { get; set; } = "TR";

        public required string TimeZoneId { get; set; }

        public Point? Location { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation Properties

        public Business Business { get; set; } = null!;

        public ICollection<StaffBranchAssignment> StaffAssignments { get; set; }
            = new HashSet<StaffBranchAssignment>();
    }
}
