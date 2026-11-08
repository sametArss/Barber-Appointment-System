namespace BarberBooking.Shared.DTOs.Scheduling
{
    public class WorkingHourBreakDto
    {
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
    }

    public class SetBranchWorkingHoursRequestDto
    {
        public Guid BranchId { get; set; }
        public List<DayWorkingHourItemDto> WorkingHours { get; set; } = new();
    }

    public class SetStaffWorkingHoursRequestDto
    {
        public Guid StaffProfileId { get; set; }
        public Guid BranchId { get; set; }
        public List<DayWorkingHourItemDto> WorkingHours { get; set; } = new();
    }

    public class DayWorkingHourItemDto
    {
        public DayOfWeek DayOfWeek { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public List<WorkingHourBreakDto> Breaks { get; set; } = new();
    }

    public class WorkingHourResponseDto
    {
        public Guid Id { get; set; }
        public DayOfWeek DayOfWeek { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public List<WorkingHourBreakDto> Breaks { get; set; } = new();
    }

    public class CreateBranchExceptionRequestDto
    {
        public Guid BranchId { get; set; }
        public int Type { get; set; } // 1: Closed, 2: SpecialWorkingHours
        public DateTimeOffset StartAt { get; set; }
        public DateTimeOffset EndAt { get; set; }
        public string? Reason { get; set; }
    }

    public class CreateStaffExceptionRequestDto
    {
        public Guid StaffProfileId { get; set; }
        public Guid BranchId { get; set; }
        public DateTimeOffset StartAt { get; set; }
        public DateTimeOffset EndAt { get; set; }
        public string? Reason { get; set; }
    }

    public class ScheduleExceptionResponseDto
    {
        public Guid Id { get; set; }
        public DateTimeOffset StartAt { get; set; }
        public DateTimeOffset EndAt { get; set; }
        public string? Reason { get; set; }
        public string? TypeName { get; set; }
    }
}