namespace BarberBooking.Entities.Common
{
    public interface ITenantEntity
    {
        Guid BusinessId { get; set; }
    }
}