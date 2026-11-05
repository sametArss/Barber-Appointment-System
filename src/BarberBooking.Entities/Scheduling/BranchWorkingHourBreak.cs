using BarberBooking.Entities.Common;

namespace BarberBooking.Entities.Scheduling
{
    public class BranchWorkingHourBreak : BaseEntity
    {
        public Guid BranchWorkingHourId { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public BranchWorkingHour BranchWorkingHour { get; set; } = null!;
    }
}