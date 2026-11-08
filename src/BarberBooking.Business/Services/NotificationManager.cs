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

            // Opsiyonel: E-posta ve SMS bilgilendirmesi
            var user = await _unitOfWork.Repository<User>().GetByIdAsync(userId, cancellationToken);
            if (user != null)
            {
                if (!string.IsNullOrWhiteSpace(user.Email))
                {
                    _ = _emailSender.SendEmailAsync(user.Email, title, message, cancellationToken);
                }

                if (!string.IsNullOrWhiteSpace(user.PhoneNumber))
                {
                    _ = _smsSender.SendSmsAsync(user.PhoneNumber, $"{title}: {message}", cancellationToken);
                }
            }

            return Result.Ok();
        }

        public async Task<IDataResult<IReadOnlyList<NotificationResponseDto>>> GetMyNotificationsAsync(bool unreadOnly = false, CancellationToken cancellationToken = default)
        {
            var userId = _tenantService.UserId;
            if (!userId.HasValue)
            {
                return DataResult<IReadOnlyList<NotificationResponseDto>>.Fail("Oturum açmanız gerekmektedir.", 401);
            }

            var query = _unitOfWork.Repository<Notification>().Query()
                .Where(n => n.UserId == userId.Value);

            if (unreadOnly)
            {
                query = query.Where(n => !n.IsRead);
            }

            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Take(50)
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

            var notificationRepo = _unitOfWork.Repository<Notification>();
            var unreadNotifications = await notificationRepo.GetAsync(
                n => n.UserId == userId.Value && !n.IsRead,
                cancellationToken);

            var now = DateTimeOffset.UtcNow;
            foreach (var n in unreadNotifications)
            {
                n.IsRead = true;
                n.ReadAt = now;
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Ok("Tüm bildirimler okundu olarak işaretlendi.");
        }
    }
}