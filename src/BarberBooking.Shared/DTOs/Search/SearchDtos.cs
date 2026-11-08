namespace BarberBooking.Shared.DTOs.Search
{
    public class NearbyBranchesQueryDto
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double RadiusKm { get; set; } = 10.0;
        public string? QueryText { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public class NearbyBranchResponseDto
    {
        public Guid BranchId { get; set; }
        public Guid BusinessId { get; set; }
        public string BusinessName { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public double Longitude { get; set; }
        public double Latitude { get; set; }
        public double DistanceMeters { get; set; }
        public double DistanceKm => Math.Round(DistanceMeters / 1000.0, 2);
        public List<string> OfferedServices { get; set; } = new();
    }
}