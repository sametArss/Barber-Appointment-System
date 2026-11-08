namespace BarberBooking.Business.Notifications
{
    public interface IEmailSender
    {
        Task SendEmailAsync(string toEmail, string subject, string body, CancellationToken cancellationToken = default);
    }

    public class NullEmailSender : IEmailSender
    {
        public Task SendEmailAsync(string toEmail, string subject, string body, CancellationToken cancellationToken = default)
        {
            // İleride SMTP veya SendGrid eklenebilir. Şu an loglayıp devam ediyor.
            return Task.CompletedTask;
        }
    }
}