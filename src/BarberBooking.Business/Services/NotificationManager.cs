using BarberBooking.Business.Notifications;
using BarberBooking.DataAccess.Repositories;
using BarberBooking.Entities.Common;
using BarberBooking.Entities.Identity;
using BarberBooking.Entities.Notifications;
using BarberBooking.Shared.DTOs.Notifications;
using BarberBooking.Shared.Results;
using Microsoft.EntityFrameworkCore;

namespace BarberBooking.Business.Services
{
    public class NotificationManager : INotificationService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentTenantService _tenantService;
        private readonly IEmailSender _emailSender;
        private readonly ISmsSender _smsSender;

        public NotificationManager(
            IUnitOfWork unitOfWork,
            ICurrentTenantService tenantService,
            IEmailSender emailSender,
            ISmsSender smsSender)
        {
            _unitOfWork = unitOfWork;
            _tenantService = tenantService;
            _emailSender = emailSender;
            _smsSender = smsSender;
        }

        public async Task<IResult> SendNotificationAsync(
            Guid userId,
            NotificationType type,
            string title,
            string message,
            Guid? relatedEntityId = null,
            CancellationToken cancellationToken = default)
        {
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = type,
                Title = title.Trim(),
                Message = message.Trim(),
                RelatedEntityId = relatedEntityId,
                IsRead = false
            };

            await _unitOfWork.Repository<Notification>().AddAsync(notification, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Opsiyonel: E-posta ve SMS bilgilendirmesi (HTTP request iptalinden bağımsız güvenli çalıştırma)
            var user = await _unitOfWork.Repository<User>().QueryAsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            if (user != null)
            {
                if (!string.IsNullOrWhiteSpace(user.Email))
                {
                    _ = Task.Run(async () =>
                    {
                        try { await _emailSender.SendEmailAsync(user.Email, title, message, CancellationToken.None); }
                        catch { /* Arka plan bildirim gönderimi ana akışı kesmemeli */ }
                    });
                }

                if (!string.IsNullOrWhiteSpace(user.PhoneNumber))
                {
                    _ = Task.Run(async () =>
                    {
                        try { await _smsSender.SendSmsAsync(user.PhoneNumber, $"{title}: {message}", CancellationToken.None); }
                        catch { /* Arka plan bildirim gönderimi ana akışı kesmemeli */ }
                    });
                }
            }

            return Result.Ok();
        }

        public async Task<IDataResult<IReadOnlyList<NotificationResponseDto>>> GetMyNotificationsAsync(bool unreadOnly = false, int skip = 0, int take = 50, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<IReadOnlyList<NotificationResponseDto>>.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var safeSkip = Math.Max(0, skip);
            var safeTake = Math.Clamp(take, 1, 100);

            var query = _unitOfWork.Repository<Notification>().QueryAsNoTracking()
                .Where(n => n.UserId == userId.Value);

            if (unreadOnly)
            {
                query = query.Where(n => !n.IsRead);
            }

            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip(safeSkip)
                .Take(safeTake)
                .ToListAsync(cancellationToken);

            var response = notifications.Select(n => new NotificationResponseDto
            {
                Id = n.Id,
                UserId = n.UserId,
                Type = (int)n.Type,
                TypeName = n.Type.ToString(),
                Title = n.Title,
                Message = n.Message,
                IsRead = n.IsRead,
                ReadAt = n.ReadAt,
                RelatedEntityId = n.RelatedEntityId,
                CreatedDate = n.CreatedAt
            }).ToList();

            return DataResult<IReadOnlyList<NotificationResponseDto>>.Ok(response);
        }

        public async Task<IDataResult<UnreadNotificationCountDto>> GetUnreadCountAsync(CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<UnreadNotificationCountDto>.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var count = await _unitOfWork.Repository<Notification>()
                .CountAsync(n => n.UserId == userId.Value && !n.IsRead, cancellationToken);

            return DataResult<UnreadNotificationCountDto>.Ok(new UnreadNotificationCountDto { UnreadCount = count });
        }

        public async Task<IResult> MarkAsReadAsync(Guid notificationId, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var notificationRepo = _unitOfWork.Repository<Notification>();
            var notification = await notificationRepo.FirstOrDefaultAsync(
                n => n.Id == notificationId && n.UserId == userId.Value,
                cancellationToken);

            if (notification == null)
            {
                return Result.Fail("Bildirim bulunamadı.", 404);
            }

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTimeOffset.UtcNow;
                notificationRepo.Update(notification);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }

            return Result.Ok();
        }

        public async Task<IResult> MarkAllAsReadAsync(CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return Result.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var now = DateTimeOffset.UtcNow;

            // Bulk SQL UPDATE: binlerce okunmamış bildirimi RAM'e çekmeden tek sorguda okundu işaretler
            await _unitOfWork.Repository<Notification>().Query()
                .Where(n => n.UserId == userId.Value && !n.IsRead)
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(n => n.IsRead, true)
                        .SetProperty(n => n.ReadAt, now)
                        .SetProperty(n => n.UpdatedAt, now),
                    cancellationToken);

            return Result.Ok("Tüm bildirimler okundu olarak işaretlendi.");
        }
    }
}