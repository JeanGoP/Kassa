using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using TPV.Application.Interfaces;

namespace TPV.Infrastructure.Services
{
    public class CurrentTenantService : ICurrentTenantService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentTenantService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public int? TenantId
        {
            get
            {
                var claim = _httpContextAccessor.HttpContext?.User?.FindFirst("tenant_id");
                if (claim != null && int.TryParse(claim.Value, out int tenantId))
                {
                    return tenantId;
                }
                return null;
            }
        }
    }
}