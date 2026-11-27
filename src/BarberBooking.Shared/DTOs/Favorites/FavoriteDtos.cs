namespace BarberBooking.Shared.DTOs.Favorites
{
    public class FavoriteBranchResponseDto
    {
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public Guid BusinessId { get; set; }
        public string BusinessName { get; set; } = string.Empty;
        public string? BusinessDescription { get; set; }
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }

        public double AverageRating { get; set; }
        public int TotalReviewCount { get; set; }
    }

    public class FavoriteToggleResponseDto
    {
        public Guid BranchId { get; set; }
        public bool IsFavorited { get; set; }
    }
}
