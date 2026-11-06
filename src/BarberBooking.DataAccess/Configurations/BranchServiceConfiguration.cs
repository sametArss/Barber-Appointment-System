using BarberBooking.Entities.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class BranchServiceConfiguration : IEntityTypeConfiguration<BranchService>
    {
        public void Configure(EntityTypeBuilder<BranchService> builder)
        {
            builder.ToTable("BranchServices");

            builder.HasKey(bs => new { bs.BranchId, bs.ServiceId });

            builder.HasOne(bs => bs.Branch)
                .WithMany()
                .HasForeignKey(bs => bs.BranchId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(bs => bs.Service)
                .WithMany(s => s.BranchServices)
                .HasForeignKey(bs => bs.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}