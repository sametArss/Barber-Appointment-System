namespace BarberBooking.Shared.DTOs.Businesses
{
    public class CreateBusinessRequestDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? TaxNumber { get; set; }

        // İlk varsayılan merkez şube bilgileri
        public string BranchName { get; set; } = "Merkez Şube";
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public double Longitude { get; set; }
        public double Latitude { get; set; }
    }

    public class CreateBranchRequestDto
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public double Longitude { get; set; }
        public double Latitude { get; set; }
    }

    public class UpdateBusinessRequestDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
    }

    public class UpdateBranchRequestDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public double Longitude { get; set; }
        public double Latitude { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class BusinessResponseDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public List<BranchResponseDto> Branches { get; set; } = new();
    }

    public class BranchResponseDto
    {
        public Guid Id { get; set; }
        public Guid BusinessId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public double Longitude { get; set; }
        public double Latitude { get; set; }
        public bool IsActive { get; set; }
    }
}
