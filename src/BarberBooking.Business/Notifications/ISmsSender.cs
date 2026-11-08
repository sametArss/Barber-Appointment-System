namespace BarberBooking.Business.Notifications
{
    public interface ISmsSender
    {
        Task SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default);
    }

    public class NullSmsSender : ISmsSender
    {
        public Task SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
        {
            // İleride Netgsm / Twilio sağlayıcısı bağlanabilir.
            return Task.CompletedTask;
        }
    }
}