
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Businesses;

namespace BarberBooking.Entities.Services
{
    public class BranchService : BaseEntity
    {
        public Guid BranchId { get; set; }

        public Guid ServiceId { get; set; }

        public decimal? PriceOverride { get; set; }

        public int? DurationOverride { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation Properties

        public Branch Branch { get; set; } = null!;

        public Service Service { get; set; } = null!;
    }
}
