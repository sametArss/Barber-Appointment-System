using BarberBooking.Entities.Customers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class CustomerPenaltyConfiguration : IEntityTypeConfiguration<CustomerPenalty>
    {
        public void Configure(EntityTypeBuilder<CustomerPenalty> builder)
        {
            builder.ToTable("CustomerPenalties");

            builder.HasKey(cp => cp.Id);

            builder.HasIndex(cp => new { cp.CustomerUserId, cp.BusinessId, cp.IsActive });

            builder.HasOne(cp => cp.Customer)
                .WithMany()
                .HasForeignKey(cp => cp.CustomerUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(cp => cp.Business)
                .WithMany()
                .HasForeignKey(cp => cp.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(cp => cp.Appointment)
                .WithMany()
                .HasForeignKey(cp => cp.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}