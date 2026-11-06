using BarberBooking.Entities.Appointments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
    {
        public void Configure(EntityTypeBuilder<Appointment> builder)
        {
            builder.ToTable("Appointments");
            builder.HasKey(a => a.Id);

            builder.Property(a => a.PriceSnapshot)
                .HasPrecision(18, 2);

            builder.Property(a => a.CancellationReason)
                .HasMaxLength(500);

            builder.HasIndex(a => a.BusinessId);
            builder.HasIndex(a => a.BranchId);
            builder.HasIndex(a => a.StaffProfileId);
            builder.HasIndex(a => a.CustomerUserId);
            builder.HasIndex(a => a.ServiceId);
            builder.HasIndex(a => new { a.StaffProfileId, a.StartAt, a.EndAt });

            builder.HasOne(a => a.Business)
                .WithMany()
                .HasForeignKey(a => a.BusinessId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(a => a.Branch)
                .WithMany()
                .HasForeignKey(a => a.BranchId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(a => a.StaffProfile)
                .WithMany()
                .HasForeignKey(a => a.StaffProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(a => a.Service)
                .WithMany()
                .HasForeignKey(a => a.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(a => a.Customer)
                .WithMany()
                .HasForeignKey(a => a.CustomerUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(a => a.StatusHistory)
                .WithOne(h => h.Appointment)
                .HasForeignKey(h => h.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}