using BarberBooking.Business.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyNotifications([FromQuery] bool unreadOnly, CancellationToken cancellationToken)
        {
            var result = await _notificationService.GetMyNotificationsAsync(unreadOnly, cancellationToken);
            return Ok(result);
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
        {
            var result = await _notificationService.GetUnreadCountAsync(cancellationToken);
            return Ok(result);
        }

        [HttpPatch("{id:guid}/read")]
        public async Task<IActionResult> MarkAsRead([FromRoute] Guid id, CancellationToken cancellationToken)
        {
            var result = await _notificationService.MarkAsReadAsync(id, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
        {
            var result = await _notificationService.MarkAllAsReadAsync(cancellationToken);
            return Ok(result);
        }
    }
}