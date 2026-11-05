
namespace BarberBooking.Entities.Businesses
{
    public class StaffBranchAssignment
    {
        public Guid StaffProfileId { get; set; }

        public Guid BranchId { get; set; }

        public DateTimeOffset AssignedAt { get; set; }
            = DateTimeOffset.UtcNow;

        // Navigation Properties

        public StaffProfile StaffProfile { get; set; } = null!;

        public Branch Branch { get; set; } = null!;
    }
}
