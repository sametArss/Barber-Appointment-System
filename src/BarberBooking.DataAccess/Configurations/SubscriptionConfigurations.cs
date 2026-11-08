using BarberBooking.Entities.Subscriptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class SubscriptionPlanConfiguration : IEntityTypeConfiguration<SubscriptionPlan>
    {
        public void Configure(EntityTypeBuilder<SubscriptionPlan> builder)
        {
            builder.ToTable("SubscriptionPlans");
            builder.HasKey(p => p.Id);
            builder.Property(p => p.Name).IsRequired().HasMaxLength(100);
            builder.Property(p => p.MonthlyPrice).HasPrecision(18, 2);
            builder.Property(p => p.AnnualPrice).HasPrecision(18, 2);
        }
    }

    public class BusinessSubscriptionConfiguration : IEntityTypeConfiguration<BusinessSubscription>
    {
        public void Configure(EntityTypeBuilder<BusinessSubscription> builder)
        {
            builder.ToTable("BusinessSubscriptions");
            builder.HasKey(s => s.Id);
            builder.HasIndex(s => new { s.BusinessId, s.Status });

            builder.HasOne(s => s.Business)
                .WithMany()
                .HasForeignKey(s => s.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(s => s.Plan)
                .WithMany(p => p.Subscriptions)
                .HasForeignKey(s => s.PlanId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}