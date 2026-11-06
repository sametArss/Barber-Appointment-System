using BarberBooking.Entities.Businesses;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class StaffBranchAssignmentConfiguration : IEntityTypeConfiguration<StaffBranchAssignment>
    {
        public void Configure(EntityTypeBuilder<StaffBranchAssignment> builder)
        {
            builder.ToTable("StaffBranchAssignments");

            // Bir çalışanın aynı şubeye mükerrer atanmasını engelleyen bileşik anahtar
            builder.HasKey(sba => new { sba.StaffProfileId, sba.BranchId });

            builder.HasOne(sba => sba.StaffProfile)
                .WithMany(sp => sp.BranchAssignments)
                .HasForeignKey(sba => sba.StaffProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(sba => sba.Branch)
                .WithMany(b => b.StaffAssignments)
                .HasForeignKey(sba => sba.BranchId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}