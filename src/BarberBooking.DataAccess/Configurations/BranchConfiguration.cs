using BarberBooking.Entities.Businesses;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class BranchConfiguration : IEntityTypeConfiguration<Branch>
    {
        public void Configure(EntityTypeBuilder<Branch> builder)
        {
            builder.ToTable("Branches");
            builder.HasKey(b => b.Id);

            // PostGIS spatial index (yakınlık sorguları) + şehir/ilçe aramaları
            builder.HasIndex(b => b.Location)
                .HasMethod("GIST");

            builder.HasIndex(b => new { b.IsActive, b.City, b.District });
        }
    }
}
