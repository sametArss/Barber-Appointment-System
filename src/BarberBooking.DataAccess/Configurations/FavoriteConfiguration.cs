using BarberBooking.Entities.Favorites;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class FavoriteConfiguration : IEntityTypeConfiguration<Favorite>
    {
        public void Configure(EntityTypeBuilder<Favorite> builder)
        {
            builder.ToTable("Favorites");

            // Bir kullanıcının aynı işletmeyi tek bir kez favoriye almasını sağlar
            builder.HasKey(f => new { f.UserId, f.BusinessId });

            builder.HasOne(f => f.User)
                .WithMany()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(f => f.Business)
                .WithMany()
                .HasForeignKey(f => f.BusinessId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}