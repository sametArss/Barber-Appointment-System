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
        private readonly INotificationService _notificationService;
        private readonly ILogger<AppointmentReminderProcessor> _logger;

        private static readonly TimeSpan ReminderWindow = TimeSpan.FromHours(2);

        public AppointmentReminderProcessor(
            IUnitOfWork unitOfWork,
            INotificationService notificationService,
            ILogger<AppointmentReminderProcessor> logger)
        {
            _unitOfWork = unitOfWork;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<(int RemindersSent, int ExpiredReschedules)> ProcessAsync(CancellationToken cancellationToken = default)
        {
            var now = DateTimeOffset.UtcNow;
            var windowEnd = now.Add(ReminderWindow);
            var appointmentRepo = _unitOfWork.Repository<Appointment>();

            // 1) Randevuya 2 saat (veya daha az) kalan onaylı ve henüz hatırlatma gitmemiş randevular
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
                .ToListAsync(cancellationToken);

            var remindersSent = 0;

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

                try
                {
                    appt.ReminderSentAt = now;
                    appointmentRepo.Update(appt);
                    await _unitOfWork.SaveChangesAsync(cancellationToken);

                    await _notificationService.SendNotificationAsync(
                        appt.CustomerUserId,
                        NotificationType.AppointmentReminder,
                        title,
                        message,
                        appt.Id,
                        cancellationToken);

                    remindersSent++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Randevu hatırlatma bildirimi gönderilirken hata oluştu. AppointmentId={AppointmentId}", appt.Id);
                }
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

            return (remindersSent, expiredCount);
        }
    }
}
