namespace BarberBooking.Shared.DTOs.Common
{
    public class ErrorResponseDto
    {
        public bool Success { get; set; } = false;
        public int StatusCode { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Details { get; set; }
        public string TraceId { get; set; } = string.Empty;
        public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
        public IDictionary<string, string[]>? ValidationErrors { get; set; }
    }
}