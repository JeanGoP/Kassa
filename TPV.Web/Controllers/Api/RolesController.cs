using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using TPV.Infrastructure.Identity;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RolesController : ControllerBase
    {
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly TPV.Application.Interfaces.ICurrentTenantService _currentTenantService;

        public RolesController(RoleManager<IdentityRole> roleManager, TPV.Application.Interfaces.ICurrentTenantService currentTenantService)
        {
            _roleManager = roleManager;
            _currentTenantService = currentTenantService;
        }

        [HttpGet]
        public ActionResult<IEnumerable<object>> GetRoles()
        {
            var query = _roleManager.Roles.AsQueryable();
            
            var roles = query
                .Select(r => new { r.Id, r.Name })
                .ToList();

            return Ok(roles);
        }

        [HttpGet("permissions")]
        public ActionResult<IEnumerable<PermissionDto>> GetPermissions()
        {
            var permissions = Permissions.All
                .Select(p => new PermissionDto { Key = p, Description = p })
                .ToList();

            return Ok(permissions);
        }

        [HttpGet("{id}/permissions")]
        public async Task<ActionResult<IEnumerable<string>>> GetRolePermissions(string id)
        {
            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
            {
                return NotFound();
            }

            var claims = await _roleManager.GetClaimsAsync(role);
            var permissions = claims
                .Where(c => c.Type == "permission")
                .Select(c => c.Value)
                .ToArray();

            return Ok(permissions);
        }

        [HttpPut("{id}/permissions")]
        [Authorize(Policy = Permissions.AdminRolesManage)]
        public async Task<IActionResult> SetRolePermissions(string id, [FromBody] IEnumerable<string> permissions)
        {
            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
            {
                return NotFound();
            }

            var currentClaims = await _roleManager.GetClaimsAsync(role);
            foreach (var claim in currentClaims.Where(c => c.Type == "permission"))
            {
                await _roleManager.RemoveClaimAsync(role, claim);
            }

            if (permissions != null)
            {
                foreach (var permission in permissions.Distinct())
                {
                    await _roleManager.AddClaimAsync(role, new Claim("permission", permission));
                }
            }

            return NoContent();
        }

        [HttpPost]
        [Authorize(Policy = Permissions.AdminRolesManage)]
        public async Task<IActionResult> CreateRole([FromBody] RoleRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest();
            }

            var exists = await _roleManager.RoleExistsAsync(request.Name);
            if (exists)
            {
                return Conflict();
            }

            var role = new IdentityRole(request.Name);
            var result = await _roleManager.CreateAsync(role);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            return Ok(new { role.Id, role.Name });
        }

        [HttpPut("{id}")]
        [Authorize(Policy = Permissions.AdminRolesManage)]
        public async Task<IActionResult> UpdateRole(string id, [FromBody] RoleRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest();
            }

            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
            {
                return NotFound();
            }

            role.Name = request.Name;
            role.NormalizedName = request.Name.ToUpperInvariant();
            var result = await _roleManager.UpdateAsync(role);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = Permissions.AdminRolesManage)]
        public async Task<IActionResult> DeleteRole(string id)
        {
            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
            {
                return NotFound();
            }

            var result = await _roleManager.DeleteAsync(role);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            return NoContent();
        }

        public class RoleRequest
        {
            public string Name { get; set; }
        }

        public class PermissionDto
        {
            public string Key { get; set; }
            public string Description { get; set; }
        }
    }
}

