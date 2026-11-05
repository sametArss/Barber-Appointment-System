
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.DataAccess.Context
{
    public class BarberBookingDbContext : DbContext
    {
        public BarberBookingDbContext(
            DbContextOptions<BarberBookingDbContext> options)
            : base(options)
        {
        }

        // Db tabloları gelecek

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
