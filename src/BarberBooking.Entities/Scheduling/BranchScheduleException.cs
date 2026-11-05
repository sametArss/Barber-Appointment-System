using BarberBooking.Entities.Common;
using BarberBooking.Entities.Businesses;

namespace BarberBooking.Entities.Scheduling
{
    public class BranchScheduleException : BaseEntity
    {
        public Guid BranchId { get; set; }

        public BranchScheduleExceptionType Type { get; set; }

        // UTC olarak saklanacak.
        public DateTimeOffset StartAt { get; set; }

        // UTC olarak saklanacak.
        public DateTimeOffset EndAt { get; set; }

        public string? Reason { get; set; }

        public Branch Branch { get; set; } = null!;
    }

    public enum BranchScheduleExceptionType
    {
        Closed = 1,
        SpecialWorkingHours = 2
    }
}