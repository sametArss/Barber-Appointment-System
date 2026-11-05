using BarberBooking.Entities.Common;
using BarberBooking.Entities.Businesses;

namespace BarberBooking.Entities.Scheduling
{
    public class StaffWorkingHour : BaseEntity
    {
        public Guid StaffProfileId { get; set; }

        public Guid BranchId { get; set; }

        public DayOfWeek DayOfWeek { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public StaffProfile StaffProfile { get; set; } = null!;

        public Branch Branch { get; set; } = null!;

        public ICollection<StaffWorkingHourBreak> Breaks { get; set; }
            = new HashSet<StaffWorkingHourBreak>();
    }
}