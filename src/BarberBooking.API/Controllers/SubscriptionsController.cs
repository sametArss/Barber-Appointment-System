using BarberBooking.Business.Services;
using BarberBooking.Shared.DTOs.Subscriptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarberBooking.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubscriptionsController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;

        public SubscriptionsController(ISubscriptionService subscriptionService)
        {
            _subscriptionService = subscriptionService;
        }

        [HttpGet("plans")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPlans(CancellationToken cancellationToken)
        {
            var result = await _subscriptionService.GetActivePlansAsync(cancellationToken);
            return Ok(result);
        }

        [HttpGet("my-subscription")]
        [Authorize(Roles = "BusinessOwner,BusinessManager")]
        public async Task<IActionResult> GetMySubscription(CancellationToken cancellationToken)
        {
            var result = await _subscriptionService.GetCurrentSubscriptionAsync(cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("subscribe")]
        [Authorize(Roles = "BusinessOwner")]
        public async Task<IActionResult> Subscribe([FromBody] SubscribeRequestDto request, CancellationToken cancellationToken)
        {
            var result = await _subscriptionService.SubscribeAsync(request, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }

        [HttpPost("cancel")]
        [Authorize(Roles = "BusinessOwner")]
        public async Task<IActionResult> Cancel([FromBody] string reason, CancellationToken cancellationToken)
        {
            var result = await _subscriptionService.CancelSubscriptionAsync(reason, cancellationToken);
            if (!result.Success)
            {
                return StatusCode(result.StatusCode, result);
            }

            return Ok(result);
        }
    }
}