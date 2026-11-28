using BarberBooking.DataAccess.Context;
using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Appointments;
using BarberBooking.Entities.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BarberBooking.Business.Services
{
    public class AppointmentReminderProcessor : IAppointmentReminderProcessor
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly BarberBookingDbContext _dbContext;
        private readonly INotificationService _notificationService;
        private readonly ILogger<AppointmentReminderProcessor> _logger;

        private static readonly TimeSpan ReminderWindow = TimeSpan.FromHours(2);
        private const long ReminderAdvisoryLockKey = 78451239L;

        public AppointmentReminderProcessor(
            IUnitOfWork unitOfWork,
            BarberBookingDbContext dbContext,
            INotificationService notificationService,
            ILogger<AppointmentReminderProcessor> logger)
        {
            _unitOfWork = unitOfWork;
            _dbContext = dbContext;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<(int RemindersSent, int ExpiredReschedules)> ProcessAsync(CancellationToken cancellationToken = default)
        {
            // Multi-replica güvenliği: transaction-scoped PostgreSQL advisory lock
            // Aynı anda birden fazla API sunucusu çalışsa bile bu turu yalnızca 1 sunucu yürütür
            await using var lockTx = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
            var lockAcquired = await _dbContext.Database
                .SqlQueryRaw<bool>($"SELECT pg_try_advisory_xact_lock({ReminderAdvisoryLockKey}) AS \"Value\"")
                .FirstOrDefaultAsync(cancellationToken);

            if (!lockAcquired)
            {
                await lockTx.RollbackAsync(cancellationToken);
                return (0, 0);
            }

            var now = DateTimeOffset.UtcNow;
            var windowEnd = now.Add(ReminderWindow);
            var appointmentRepo = _unitOfWork.Repository<Appointment>();

            // 1) Randevuya 2 saat (veya daha az) kalan onaylı ve henüz hatırlatma gitmemiş randevular (batch: 200)
            var upcomingAppointments = await appointmentRepo.Query()
                .IgnoreQueryFilters()
                .Include(a => a.Branch)
                .Include(a => a.Service)
                .Include(a => a.StaffProfile).ThenInclude(sp => sp.BusinessMember).ThenInclude(bm => bm.User)
                .Where(a =>
                    a.Status == AppointmentStatus.Confirmed &&
                    a.ReminderSentAt == null &&
                    a.ProposedStartAt == null &&
                    a.StartAt > now &&
                    a.StartAt <= windowEnd)
                .OrderBy(a => a.StartAt)
                .Take(200)
                .ToListAsync(cancellationToken);

            var remindersSent = 0;

            if (upcomingAppointments.Count > 0)
            {
                var notificationRepo = _unitOfWork.Repository<Notification>();

                foreach (var appt in upcomingAppointments)
                {
                    var remainingMinutes = Math.Max(1, (int)Math.Round((appt.StartAt - now).TotalMinutes));
                    var remainingText = remainingMinutes >= 90
                        ? "yaklaşık 2 saat"
                        : remainingMinutes >= 45
                            ? "yaklaşık 1 saat"
                            : $"{remainingMinutes} dakika";

                    var timeStr = appt.StartAt.ToOffset(TimeSpan.FromHours(3)).ToString("HH:mm");
                    var staffName = appt.StaffProfile?.BusinessMember?.User != null
                        ? $"{appt.StaffProfile.BusinessMember.User.FirstName} {appt.StaffProfile.BusinessMember.User.LastName}".Trim()
                        : "personeliniz";
                    var branchName = appt.Branch?.Name ?? "Salon";
                    var serviceName = appt.Service?.Name ?? "Hizmet";

                    var title = remainingMinutes >= 90
                        ? "Randevunuza 2 Saat Kaldı"
                        : "Randevu Hatırlatması";
                    var message =
                        $"{branchName} şubesinde {staffName} ile saat {timeStr} için planlanan {serviceName} randevunuza {remainingText} kaldı.";

                    appt.ReminderSentAt = now;
                    appointmentRepo.Update(appt);

                    await notificationRepo.AddAsync(new Notification
                    {
                        Id = Guid.NewGuid(),
                        UserId = appt.CustomerUserId,
                        Type = NotificationType.AppointmentReminder,
                        Title = title,
                        Message = message,
                        RelatedEntityId = appt.Id,
                        IsRead = false
                    }, cancellationToken);

                    remindersSent++;
                }

                // Tek SaveChangesAsync ile tüm ReminderSentAt + Notification kayıtları toplu yazılır
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }

            // 2) Saat değişikliği teklifi süresi dolmuş (StartAt geçmiş) randevuları arka planda otomatik iptal et
            var expiredReschedules = await appointmentRepo.Query()
                .IgnoreQueryFilters()
                .Include(a => a.Branch)
                .Include(a => a.Customer)
                .Include(a => a.StaffProfile).ThenInclude(sp => sp.BusinessMember)
                .Where(a =>
                    a.Status == AppointmentStatus.Confirmed &&
                    a.ProposedStartAt != null &&
                    a.StartAt <= now)
                .OrderBy(a => a.StartAt)
                .Take(200)
                .ToListAsync(cancellationToken);

            var expiredCount = 0;
            if (expiredReschedules.Count > 0)
            {
                var historyRepo = _unitOfWork.Repository<AppointmentStatusHistory>();

                foreach (var appt in expiredReschedules)
                {
                    appt.Status = AppointmentStatus.Cancelled;
                    appt.CancelledAt = now;
                    appt.CancellationReason = "Saat değişikliği teklifi randevu saatine kadar onaylanmadığı için otomatik iptal edildi.";
                    appt.ProposedStartAt = null;
                    appt.ProposedEndAt = null;
                    appt.RescheduleNote = null;
                    appt.RescheduleProposedByUserId = null;
                    appt.RescheduleProposedAt = null;
                    appointmentRepo.Update(appt);

                    await historyRepo.AddAsync(new AppointmentStatusHistory
                    {
                        Id = Guid.NewGuid(),
                        AppointmentId = appt.Id,
                        OldStatus = AppointmentStatus.Confirmed,
                        NewStatus = AppointmentStatus.Cancelled,
                        ChangedByUserId = appt.CustomerUserId,
                        Note = appt.CancellationReason
                    }, cancellationToken);

                    expiredCount++;
                }

                await _unitOfWork.SaveChangesAsync(cancellationToken);

                foreach (var appt in expiredReschedules)
                {
                    var dateStr = appt.StartAt.ToOffset(TimeSpan.FromHours(3)).ToString("dd.MM.yyyy HH:mm");
                    var branchName = appt.Branch?.Name ?? "Salon";
                    try
                    {
                        await _notificationService.SendNotificationAsync(
                            appt.CustomerUserId,
                            NotificationType.AppointmentCancelled,
                            "Randevunuz Otomatik İptal Edildi",
                            $"{branchName} şubesindeki {dateStr} tarihli randevunuz için gönderilen saat değişikliği teklifi süresinde onaylanmadığından randevunuz otomatik iptal edildi.",
                            appt.Id,
                            cancellationToken);

                        var staffUserId = appt.StaffProfile?.BusinessMember?.UserId;
                        if (staffUserId.HasValue && staffUserId.Value != appt.CustomerUserId)
                        {
                            var customerName = appt.Customer != null
                                ? $"{appt.Customer.FirstName} {appt.Customer.LastName}".Trim()
                                : "Müşteri";
                            await _notificationService.SendNotificationAsync(
                                staffUserId.Value,
                                NotificationType.AppointmentCancelled,
                                "Saat Değişikliği Süresi Doldu",
                                $"{customerName} müşterisinin {dateStr} randevusu için saat değişikliği teklifi onaylanmadığından randevu otomatik iptal edildi.",
                                appt.Id,
                                cancellationToken);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Süresi dolan reschedule bildirimi gönderilemedi. AppointmentId={AppointmentId}", appt.Id);
                    }
                }
            }

            await lockTx.CommitAsync(cancellationToken);
            return (remindersSent, expiredCount);
        }

        public async Task<int> CleanupOldNotificationsAsync(int retentionDays = 30, CancellationToken cancellationToken = default)
        {
            var safeDays = Math.Max(1, retentionDays);
            var cutoffUtc = DateTimeOffset.UtcNow.AddDays(-safeDays);

            // Bulk SQL DELETE: 30 günden eski bildirimleri RAM'e çekmeden tek sorguda temizler
            var deletedCount = await _unitOfWork.Repository<Notification>().Query()
                .IgnoreQueryFilters()
                .Where(n => n.CreatedAt < cutoffUtc)
                .ExecuteDeleteAsync(cancellationToken);

            return deletedCount;
        }

        public async Task<int> CleanupExpiredRefreshTokensAsync(int revokedRetentionDays = 7, CancellationToken cancellationToken = default)
        {
            var nowUtc = DateTime.UtcNow;
            var revokedCutoffUtc = nowUtc.AddDays(-Math.Max(1, revokedRetentionDays));

            // Bulk SQL DELETE: süresi dolmuş veya 7+ gündür iptal edilmiş refresh token'ları temizler
            var deletedCount = await _unitOfWork.Repository<Entities.Identity.RefreshToken>().Query()
                .IgnoreQueryFilters()
                .Where(rt => rt.ExpiresAt <= nowUtc || (rt.RevokedAt != null && rt.RevokedAt < revokedCutoffUtc))
                .ExecuteDeleteAsync(cancellationToken);

            return deletedCount;
        }
    }
}
