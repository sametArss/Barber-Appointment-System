using BarberBooking.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.ToTable("Users");
            builder.HasKey(u => u.Id);

            // Login ve Register performans + eşzamanlı duplicate e-posta koruması
            builder.HasIndex(u => u.NormalizedEmail)
                .IsUnique();
        }
    }
}
