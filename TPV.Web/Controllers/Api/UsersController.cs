using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using TPV.Infrastructure.Identity;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = Permissions.AdminUsersManage)]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public UsersController(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
        {
            _userManager = userManager;
            _roleManager = roleManager;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
        {
            var users = _userManager.Users.ToList();
            var result = new List<UserDto>();

            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                result.Add(new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    IsActive = user.IsActive,
                    Roles = roles.ToArray()
                });
            }

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserDto>> GetUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            var roles = await _userManager.GetRolesAsync(user);
            var dto = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                Roles = roles.ToArray()
            };

            return Ok(dto);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest();
            }

            var existing = await _userManager.FindByEmailAsync(request.Email);
            if (existing != null)
            {
                return Conflict();
            }

            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FirstName = request.FirstName,
                LastName = request.LastName,
                IsActive = true
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            if (request.Roles != null && request.Roles.Any())
            {
                var rolesToAssign = request.Roles.Distinct().ToArray();
                foreach (var roleName in rolesToAssign)
                {
                    if (!await _roleManager.RoleExistsAsync(roleName))
                    {
                        continue;
                    }
                    await _userManager.AddToRoleAsync(user, roleName);
                }
            }

            var createdRoles = await _userManager.GetRolesAsync(user);
            var dto = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                Roles = createdRoles.ToArray()
            };

            return Ok(dto);
        }

        [HttpPut("{id}/roles")]
        public async Task<IActionResult> SetUserRoles(string id, [FromBody] IEnumerable<string> roles)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            var currentRoles = await _userManager.GetRolesAsync(user);
            var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!removeResult.Succeeded)
            {
                return BadRequest(removeResult.Errors);
            }

            if (roles != null)
            {
                var rolesToAssign = roles.Distinct().ToArray();
                foreach (var roleName in rolesToAssign)
                {
                    if (!await _roleManager.RoleExistsAsync(roleName))
                    {
                        continue;
                    }
                    await _userManager.AddToRoleAsync(user, roleName);
                }
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            return NoContent();
        }

        public class UserDto
        {
            public string Id { get; set; }
            public string Email { get; set; }
            public string FirstName { get; set; }
            public string LastName { get; set; }
            public bool IsActive { get; set; }
            public string[] Roles { get; set; }
        }

        public class CreateUserRequest
        {
            public string Email { get; set; }
            public string Password { get; set; }
            public string FirstName { get; set; }
            public string LastName { get; set; }
            public string[] Roles { get; set; }
        }
    }
}

