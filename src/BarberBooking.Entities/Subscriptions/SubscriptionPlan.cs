using BarberBooking.Entities.Common;

namespace BarberBooking.Entities.Subscriptions
{
    public class SubscriptionPlan : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal MonthlyPrice { get; set; }
        public decimal AnnualPrice { get; set; }
        public int MaxBranchCount { get; set; }
        public int MaxStaffPerBranch { get; set; }
        public int MaxMonthlyAppointments { get; set; }
        public bool HasSmsNotification { get; set; }
        public bool HasAdvancedReporting { get; set; }
        public bool IsActive { get; set; } = true;

        // Navigation Properties
        public ICollection<BusinessSubscription> Subscriptions { get; set; } 
            = new HashSet<BusinessSubscription>();
    }
}