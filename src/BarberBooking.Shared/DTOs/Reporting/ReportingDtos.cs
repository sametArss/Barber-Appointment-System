namespace BarberBooking.Shared.DTOs.Reporting
{
    public class DashboardSummaryQueryDto
    {
        public Guid? BranchId { get; set; }
        public DateTimeOffset? StartDate { get; set; }
        public DateTimeOffset? EndDate { get; set; }
    }

    public class DashboardSummaryResponseDto
    {
        public decimal TotalRevenue { get; set; }
        public int TotalAppointments { get; set; }
        public int CompletedAppointments { get; set; }
        public int CancelledAppointments { get; set; }
        public int NoShowAppointments { get; set; }
        public double CancellationRate { get; set; }
        public double AverageRating { get; set; }
        public List<TopServiceReportDto> TopServices { get; set; } = new();
        public List<StaffPerformanceReportDto> StaffPerformances { get; set; } = new();
    }

    public class TopServiceReportDto
    {
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public int AppointmentCount { get; set; }
        public decimal TotalRevenue { get; set; }
    }

    public class StaffPerformanceReportDto
    {
        public Guid StaffProfileId { get; set; }
        public string StaffFullName { get; set; } = string.Empty;
        public int CompletedAppointments { get; set; }
        public decimal TotalRevenue { get; set; }
        public double AverageRating { get; set; }
    }
}