
using BarberBooking.Entities.Common;

namespace BarberBooking.Entities.Businesses
{
    public class StaffProfile : BaseEntity
    {
        public Guid BusinessMemberId { get; set; }

        public string? Biography { get; set; }

        public string? ProfileImageUrl { get; set; }

        public bool IsBookable { get; set; } = true;

        // Navigation Properties

        public BusinessMember BusinessMember { get; set; } = null!;

        public ICollection<StaffBranchAssignment> BranchAssignments { get; set; }
            = new HashSet<StaffBranchAssignment>();
    }
}
