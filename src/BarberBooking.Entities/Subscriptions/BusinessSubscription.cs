using BarberBooking.Entities.Businesses;
using BarberBooking.Entities.Common;

namespace BarberBooking.Entities.Subscriptions
{
    public class BusinessSubscription : BaseEntity, ITenantEntity
    {
        public Guid BusinessId { get; set; }
        public Guid PlanId { get; set; }
        public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;
        public SubscriptionBillingCycle BillingCycle { get; set; } = SubscriptionBillingCycle.Monthly;
        public DateTimeOffset StartDate { get; set; }
        public DateTimeOffset EndDate { get; set; }
        public bool AutoRenew { get; set; } = true;
        public DateTimeOffset? CancelledAt { get; set; }
        public string? CancellationReason { get; set; }

        // Navigation Properties
        public Business Business { get; set; } = null!;
        public SubscriptionPlan Plan { get; set; } = null!;
    }

    public enum SubscriptionStatus
    {
        Trial = 1,
        Active = 2,
        PastDue = 3,
        Cancelled = 4,
        Expired = 5
    }

    public enum SubscriptionBillingCycle
    {
        Monthly = 1,
        Annual = 2
    }
}