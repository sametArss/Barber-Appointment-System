using BarberBooking.Entities.Businesses;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class BusinessConfiguration : IEntityTypeConfiguration<Business>
    {
        public void Configure(EntityTypeBuilder<Business> builder)
        {
            builder.ToTable("Businesses");
            builder.HasKey(b => b.Id);

            builder.Property(b => b.Name)
                .IsRequired()
                .HasMaxLength(150);

            builder.HasIndex(b => b.Name);

            builder.HasMany(b => b.Branches)
                .WithOne(br => br.Business)
                .HasForeignKey(br => br.BusinessId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(b => b.Members)
                .WithOne(m => m.Business)
                .HasForeignKey(m => m.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}