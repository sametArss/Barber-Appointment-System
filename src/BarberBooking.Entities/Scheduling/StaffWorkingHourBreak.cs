using BarberBooking.Entities.Common;

namespace BarberBooking.Entities.Scheduling
{
    public class StaffWorkingHourBreak : BaseEntity
    {
        public Guid StaffWorkingHourId { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public StaffWorkingHour StaffWorkingHour { get; set; } = null!;
    }
}