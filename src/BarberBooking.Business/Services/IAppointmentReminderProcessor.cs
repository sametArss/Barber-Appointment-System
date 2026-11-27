namespace BarberBooking.Business.Services
{
    public interface IAppointmentReminderProcessor
    {
        Task<(int RemindersSent, int ExpiredReschedules)> ProcessAsync(CancellationToken cancellationToken = default);
    }
}
