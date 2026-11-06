using System.Security.Claims;
using BarberBooking.Entities.Common;
using Microsoft.AspNetCore.Http;

namespace BarberBooking.Business.Security
{
    public class CurrentTenantService : ICurrentTenantService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentTenantService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public Guid? BusinessId
        {
            get
            {
                var claim = _httpContextAccessor.HttpContext?.User?.FindFirst("business_id")?.Value;
                return Guid.TryParse(claim, out var parsed) ? parsed : null;
            }
        }

        public Guid? UserId
        {
            get
            {
                var claim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                            ?? _httpContextAccessor.HttpContext?.User?.FindFirst("sub")?.Value;
                return Guid.TryParse(claim, out var parsed) ? parsed : null;
            }
        }

        public bool IsSuperAdmin =>
            _httpContextAccessor.HttpContext?.User?.IsInRole("SuperAdmin") ?? false;
    }
}