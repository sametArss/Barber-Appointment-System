
using BarberBooking.Entities.Common;

namespace BarberBooking.Entities.Services
{
    public class Service : BaseEntity
    {
        public Guid BusinessId { get; set; }

        public required string Name { get; set; }

        public string? Description { get; set; }

        public decimal BasePrice { get; set; }

        public int DurationMinutes { get; set; }

        public string? ImageUrl { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation Properties

        public ICollection<BranchService> BranchServices { get; set; }
            = new HashSet<BranchService>();

        public ICollection<StaffService> StaffServices { get; set; }
            = new HashSet<StaffService>();
    }
}
