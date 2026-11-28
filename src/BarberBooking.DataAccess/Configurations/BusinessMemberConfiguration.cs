using BarberBooking.Entities.Businesses;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BarberBooking.DataAccess.Configurations
{
    public class BusinessMemberConfiguration : IEntityTypeConfiguration<BusinessMember>
    {
        public void Configure(EntityTypeBuilder<BusinessMember> builder)
        {
            builder.ToTable("BusinessMembers");
            builder.HasKey(bm => bm.Id);

            builder.HasIndex(bm => bm.UserId);
            builder.HasIndex(bm => new { bm.BusinessId, bm.UserId });
        }
    }
}
