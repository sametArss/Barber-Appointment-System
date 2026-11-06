namespace BarberBooking.Entities.Common
{
    public interface ICurrentTenantService
    {
        Guid? BusinessId { get; }
        Guid? UserId { get; }
        bool IsSuperAdmin { get; }
    }
}