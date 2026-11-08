using BarberBooking.Entities.Reviews;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class ReviewConfiguration : IEntityTypeConfiguration<Review>
    {
        public void Configure(EntityTypeBuilder<Review> builder)
        {
            builder.ToTable("Reviews");

            builder.HasKey(r => r.Id);

            // Bir randevuya sadece 1 yorum yapılabilir
            builder.HasIndex(r => r.AppointmentId).IsUnique();

            builder.HasIndex(r => new { r.BusinessId, r.CreatedAt });

            builder.Property(r => r.Rating).IsRequired();
            builder.Property(r => r.Comment).HasMaxLength(1000);

            builder.HasOne(r => r.Appointment)
                .WithMany()
                .HasForeignKey(r => r.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(r => r.Customer)
                .WithMany()
                .HasForeignKey(r => r.CustomerUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(r => r.Business)
                .WithMany()
                .HasForeignKey(r => r.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}