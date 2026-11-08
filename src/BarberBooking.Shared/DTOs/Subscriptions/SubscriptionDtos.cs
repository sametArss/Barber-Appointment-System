namespace BarberBooking.Shared.DTOs.Subscriptions
{
    public class SubscriptionPlanDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal MonthlyPrice { get; set; }
        public decimal AnnualPrice { get; set; }
        public int MaxBranchCount { get; set; }
        public int MaxStaffPerBranch { get; set; }
        public int MaxMonthlyAppointments { get; set; }
        public bool HasSmsNotification { get; set; }
        public bool HasAdvancedReporting { get; set; }
        public bool IsActive { get; set; }
    }

    public class SubscribeRequestDto
    {
        public Guid PlanId { get; set; }
        public int BillingCycle { get; set; } // 1: Monthly, 2: Annual
    }

    public class BusinessSubscriptionDetailsDto
    {
        public Guid SubscriptionId { get; set; }
        public Guid BusinessId { get; set; }
        public Guid PlanId { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public int Status { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public int BillingCycle { get; set; }
        public DateTimeOffset StartDate { get; set; }
        public DateTimeOffset EndDate { get; set; }
        public bool AutoRenew { get; set; }
        public int MaxBranchCount { get; set; }
        public int MaxStaffPerBranch { get; set; }
        public int MaxMonthlyAppointments { get; set; }
        public int CurrentBranchCount { get; set; }
        public int CurrentStaffCount { get; set; }
    }
}