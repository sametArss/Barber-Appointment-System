namespace BarberBooking.Shared.DTOs.Notifications
{
    public class NotificationResponseDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public int Type { get; set; }
        public string TypeName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTimeOffset? ReadAt { get; set; }
        public Guid? RelatedEntityId { get; set; }
        public DateTimeOffset CreatedDate { get; set; }
    }

    public class UnreadNotificationCountDto
    {
        public int UnreadCount { get; set; }
    }
}