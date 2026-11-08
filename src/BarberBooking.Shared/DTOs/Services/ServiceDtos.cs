namespace BarberBooking.Shared.DTOs.Services
{
    public class CreateServiceRequestDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal BasePrice { get; set; }
        public int DurationMinutes { get; set; }
        public string? ImageUrl { get; set; }
        public List<Guid>? AssignToBranchIds { get; set; }
    }

    public class UpdateServiceRequestDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal BasePrice { get; set; }
        public int DurationMinutes { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsActive { get; set; }
    }

    public class AssignBranchServiceRequestDto
    {
        public Guid BranchId { get; set; }
        public Guid ServiceId { get; set; }
        public decimal? PriceOverride { get; set; }
        public int? DurationOverride { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class AssignStaffServicesRequestDto
    {
        public Guid StaffProfileId { get; set; }
        public List<Guid> ServiceIds { get; set; } = new();
    }

    public class ServiceResponseDto
    {
        public Guid Id { get; set; }
        public Guid BusinessId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal BasePrice { get; set; }
        public int DurationMinutes { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsActive { get; set; }
    }

    public class BranchServiceResponseDto
    {
        public Guid Id { get; set; }
        public Guid BranchId { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal FinalPrice { get; set; }
        public int FinalDurationMinutes { get; set; }
        public bool IsActive { get; set; }
    }
}