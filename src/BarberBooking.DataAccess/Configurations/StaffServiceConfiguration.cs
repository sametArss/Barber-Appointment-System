using BarberBooking.Entities.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class StaffServiceConfiguration : IEntityTypeConfiguration<StaffService>
    {
        public void Configure(EntityTypeBuilder<StaffService> builder)
        {
            builder.ToTable("StaffServices");

            builder.HasKey(ss => new { ss.StaffProfileId, ss.ServiceId });

            builder.HasOne(ss => ss.StaffProfile)
                .WithMany()
                .HasForeignKey(ss => ss.StaffProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(ss => ss.Service)
                .WithMany(s => s.StaffServices)
                .HasForeignKey(ss => ss.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}