using BarberBooking.Business.Services;

namespace BarberBooking.API.BackgroundServices
{
    public class AppointmentReminderBackgroundService : BackgroundService
    {
        private static readonly TimeSpan StartupDelay = TimeSpan.FromSeconds(10);
        private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(1);
        private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(6);
        private const int NotificationRetentionDays = 30;

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AppointmentReminderBackgroundService> _logger;
        private DateTimeOffset _lastCleanupUtc = DateTimeOffset.MinValue;

        public AppointmentReminderBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<AppointmentReminderBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("AppointmentReminderBackgroundService başlatıldı (aralık: {Interval}).", PollInterval);

            try
            {
                await Task.Delay(StartupDelay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            await RunOnceSafeAsync(stoppingToken);

            using var timer = new PeriodicTimer(PollInterval);
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await RunOnceSafeAsync(stoppingToken);
            }
        }

        private async Task RunOnceSafeAsync(CancellationToken stoppingToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var processor = scope.ServiceProvider.GetRequiredService<IAppointmentReminderProcessor>();
                var (remindersSent, expiredReschedules) = await processor.ProcessAsync(stoppingToken);

                if (remindersSent > 0 || expiredReschedules > 0)
                {
                    _logger.LogInformation(
                        "AppointmentReminderBackgroundService turu tamamlandı: {RemindersSent} hatırlatma gönderildi, {ExpiredReschedules} süresi dolan teklif iptal edildi.",
                        remindersSent,
                        expiredReschedules);
                }

                // 30 günden eski bildirimleri ve süresi dolan RefreshToken'ları periyodik olarak (başlangıçta ve 6 saatte bir) temizle
                var now = DateTimeOffset.UtcNow;
                if (now - _lastCleanupUtc >= CleanupInterval)
                {
                    var deletedNotifications = await processor.CleanupOldNotificationsAsync(NotificationRetentionDays, stoppingToken);
                    var deletedTokens = await processor.CleanupExpiredRefreshTokensAsync(7, stoppingToken);
                    _lastCleanupUtc = now;

                    if (deletedNotifications > 0 || deletedTokens > 0)
                    {
                        _logger.LogInformation(
                            "Periyodik temizlik tamamlandı: {DeletedNotifications} eski bildirim (TTL {Days} gün), {DeletedTokens} süresi dolmuş RefreshToken silindi.",
                            deletedNotifications,
                            NotificationRetentionDays,
                            deletedTokens);
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Uygulama kapanıyor
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AppointmentReminderBackgroundService çalışırken beklenmeyen bir hata oluştu.");
            }
        }
    }
}
