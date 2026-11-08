namespace BarberBooking.Shared.DTOs.Reviews
{
    public class CreateReviewRequestDto
    {
        public Guid AppointmentId { get; set; }
        public int Rating { get; set; } // 1 - 5
        public string? Comment { get; set; }
    }

    public class ReviewResponseDto
    {
        public Guid Id { get; set; }
        public Guid AppointmentId { get; set; }
        public Guid CustomerUserId { get; set; }
        public string CustomerFullName { get; set; } = string.Empty;
        public Guid BusinessId { get; set; }
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public Guid StaffProfileId { get; set; }
        public string StaffFullName { get; set; } = string.Empty;
        public string ServiceName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public DateTimeOffset CreatedDate { get; set; }
    }

    public class BusinessReviewSummaryDto
    {
        public Guid BusinessId { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviewCount { get; set; }
        public List<ReviewResponseDto> RecentReviews { get; set; } = new();
    }
}