using BarberBooking.Entities.Common;
using BarberBooking.Entities.Businesses;

namespace BarberBooking.Entities.Scheduling
{
    public class StaffScheduleException : BaseEntity
    {
        public Guid StaffProfileId { get; set; }

        public Guid BranchId { get; set; }

        // UTC olarak saklanacak.
        public DateTimeOffset StartAt { get; set; }

        // UTC olarak saklanacak.
        public DateTimeOffset EndAt { get; set; }

        public string? Reason { get; set; }

        public StaffProfile StaffProfile { get; set; } = null!;

        public Branch Branch { get; set; } = null!;
    }
}