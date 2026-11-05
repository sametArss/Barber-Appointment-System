using BarberBooking.Entities.Identity;
using BarberBooking.Entities.Businesses;

namespace BarberBooking.Entities.Favorites
{
    public class Favorite
    {
        public Guid UserId { get; set; }

        public Guid BusinessId { get; set; }

        public DateTimeOffset CreatedAt { get; set; }
            = DateTimeOffset.UtcNow;

        public User User { get; set; } = null!;

        public Business Business { get; set; } = null!;
    }
}