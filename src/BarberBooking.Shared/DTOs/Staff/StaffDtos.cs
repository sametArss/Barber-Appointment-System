namespace BarberBooking.Shared.DTOs.Staff
{
    public class CreateStaffRequestDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? Biography { get; set; }
        public string? ProfileImageUrl { get; set; }
        public bool IsBookable { get; set; } = true;
        public List<Guid> BranchIds { get; set; } = new();
    }

    public class AssignStaffBranchesRequestDto
    {
        public Guid StaffProfileId { get; set; }
        public List<Guid> BranchIds { get; set; } = new();
    }

    public class UpdateStaffProfileRequestDto
    {
        public Guid StaffProfileId { get; set; }
        public string? Biography { get; set; }
        public string? ProfileImageUrl { get; set; }
        public bool IsBookable { get; set; }
    }

    public class StaffResponseDto
    {
        public Guid Id { get; set; }
        public Guid BusinessMemberId { get; set; }
        public Guid UserId { get; set; }
        public Guid BusinessId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? TemporaryPassword { get; set; }
        public bool AccountAlreadyExisted { get; set; }
        public string? Biography { get; set; }
        public string? ProfileImageUrl { get; set; }
        public bool IsBookable { get; set; }
        public List<Guid> AssignedBranchIds { get; set; } = new();
    }

    public class EmployeeWorkplaceResponseDto
    {
        public Guid StaffProfileId { get; set; }
        public Guid BusinessId { get; set; }
        public string BusinessName { get; set; } = string.Empty;
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string BusinessPhoneNumber { get; set; } = string.Empty;
        public string? Biography { get; set; }
        public bool IsBookable { get; set; }
    }
}
