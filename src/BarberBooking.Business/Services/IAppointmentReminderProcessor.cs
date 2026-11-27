namespace BarberBooking.Business.Services
{
    public interface IAppointmentReminderProcessor
    {
        Task<(int RemindersSent, int ExpiredReschedules)> ProcessAsync(CancellationToken cancellationToken = default);
        Task<int> CleanupOldNotificationsAsync(int retentionDays = 30, CancellationToken cancellationToken = default);
    }
}
