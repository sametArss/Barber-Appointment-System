using BarberBooking.Entities.Common;
using BarberBooking.Entities.Businesses;

namespace BarberBooking.Entities.Scheduling
{
    public class BranchWorkingHour : BaseEntity
    {
        public Guid BranchId { get; set; }

        public DayOfWeek DayOfWeek { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public Branch Branch { get; set; } = null!;

        public ICollection<BranchWorkingHourBreak> Breaks { get; set; }
            = new HashSet<BranchWorkingHourBreak>();
    }
}