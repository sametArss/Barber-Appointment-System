using BarberBooking.Entities.Notifications;
using BarberBooking.Shared.DTOs.Notifications;
using BarberBooking.Shared.Results;

namespace BarberBooking.Business.Services
{
    public interface INotificationService
    {
        Task<IResult> SendNotificationAsync(Guid userId, NotificationType type, string title, string message, Guid? relatedEntityId = null, CancellationToken cancellationToken = default);
        Task<IDataResult<IReadOnlyList<NotificationResponseDto>>> GetMyNotificationsAsync(bool unreadOnly = false, CancellationToken cancellationToken = default);
        Task<IDataResult<UnreadNotificationCountDto>> GetUnreadCountAsync(CancellationToken cancellationToken = default);
        Task<IResult> MarkAsReadAsync(Guid notificationId, CancellationToken cancellationToken = default);
        Task<IResult> MarkAllAsReadAsync(CancellationToken cancellationToken = default);
    }
}