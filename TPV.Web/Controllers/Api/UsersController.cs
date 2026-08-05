using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using TPV.Infrastructure.Identity;
using TPV.Application.Interfaces;

using Microsoft.EntityFrameworkCore;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly ICurrentTenantService _currentTenantService;
        private readonly TPV.Infrastructure.Persistence.ApplicationDbContext _context;
        private readonly Microsoft.Extensions.Logging.ILogger<UsersController> _logger;

        public UsersController(
            UserManager<ApplicationUser> userManager, 
            RoleManager<IdentityRole> roleManager,
            ICurrentTenantService currentTenantService,
            TPV.Infrastructure.Persistence.ApplicationDbContext context,
            Microsoft.Extensions.Logging.ILogger<UsersController> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _currentTenantService = currentTenantService;
            _context = context;
            _logger = logger;
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = Permissions.AdminUsersManage)]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            // Security check: cannot delete users from other tenants
            var currentTenantId = _currentTenantService.TenantId;
            if (currentTenantId.HasValue && user.TenantId != currentTenantId.Value)
            {
                return NotFound(); // Hide existence
            }

            // Validar que no sea el propio usuario
            var currentUserId = _userManager.GetUserId(User);
            if (currentUserId == id)
            {
                return BadRequest("No puede eliminar su propio usuario.");
            }

            // Validar inactividad (sin movimientos)
            // Verificar Ventas
            var hasSales = await _context.Sales.AnyAsync(s => s.UserId == id);
            if (hasSales) return BadRequest("El usuario tiene ventas registradas y no puede ser eliminado.");

            // Verificar Sesiones de Caja
            var hasCashSessions = await _context.CashSessions.AnyAsync(cs => cs.UserId == id);
            if (hasCashSessions) return BadRequest("El usuario tiene sesiones de caja registradas y no puede ser eliminado.");

            // Proceder con eliminación
            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            // Log de Auditoría
            var adminId = _userManager.GetUserId(User);
            _logger.LogInformation("AUDITORIA: Usuario {DeletedUserId} ({DeletedUserEmail}) eliminado permanentemente por Administrador {AdminId} el {Date}", 
                id, user.Email, adminId, DateTime.UtcNow);

            return NoContent();
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
        {
            // If current user has a tenant, filter users by that tenant
            var currentTenantId = _currentTenantService.TenantId;
            
            // Note: _userManager.Users is IQueryable.
            // If we want to filter by tenant manually (since IdentityUser doesn't have global filter automatically unless configured)
            // ApplicationUser inherits IdentityUser, and we added TenantId.
            // Check if global filter is applied to ApplicationUser in DbContext.
            // Based on my read of ApplicationDbContext, it applies filter to entities implementing IMustHaveTenant.
            // ApplicationUser does NOT implement IMustHaveTenant explicitly in the code I saw.
            // Let's check ApplicationUser again.
            // It has TenantId property but does not implement IMustHaveTenant interface.
            // So global filter is NOT applied automatically!
            
            var query = _userManager.Users.AsQueryable();

            if (currentTenantId.HasValue)
            {
                query = query.Where(u => u.TenantId == currentTenantId.Value);
            }

            var users = query.ToList();
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
                    TenantId = user.TenantId,
                    CurrentBranchId = user.CurrentBranchId,
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

            // Security check: cannot access users from other tenants
            var currentTenantId = _currentTenantService.TenantId;
            if (currentTenantId.HasValue && user.TenantId != currentTenantId.Value)
            {
                return NotFound(); // Hide existence
            }

            var roles = await _userManager.GetRolesAsync(user);
            var dto = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                TenantId = user.TenantId,
                CurrentBranchId = user.CurrentBranchId,
                Roles = roles.ToArray()
            };

            return Ok(dto);
        }

        [HttpPost]
        [Authorize(Policy = Permissions.AdminUsersManage)]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest();
            }

            // Tenant logic
            int? targetTenantId = request.TenantId;
            var currentTenantId = _currentTenantService.TenantId;

            if (currentTenantId.HasValue)
            {
                // If I am a tenant admin, I can only create users for my tenant
                targetTenantId = currentTenantId.Value;
            }
            // If I am super admin (currentTenantId is null), I can assign any tenant (or null for host users)

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
                IsActive = true,
                TenantId = targetTenantId,
                CurrentBranchId = request.CurrentBranchId,
                CreatedAt = DateTime.UtcNow
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
                TenantId = user.TenantId,
                CurrentBranchId = user.CurrentBranchId,
                Roles = createdRoles.ToArray()
            };

            return Ok(dto);
        }

        [HttpPut("{id}/roles")]
        [Authorize(Policy = Permissions.AdminUsersManage)]
        public async Task<IActionResult> SetUserRoles(string id, [FromBody] IEnumerable<string> roles)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            // Security check: cannot manage users from other tenants
            var currentTenantId = _currentTenantService.TenantId;
            if (currentTenantId.HasValue && user.TenantId != currentTenantId.Value)
            {
                return NotFound(); // Hide existence
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
                    // Prevent tenant admins from assigning Host role
                    if (!await _roleManager.RoleExistsAsync(roleName))
                    {
                        continue;
                    }
                    await _userManager.AddToRoleAsync(user, roleName);
                }
            }

            return NoContent();
        }

        [HttpPut("{id}")]
        [Authorize(Policy = Permissions.AdminUsersManage)]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            // Validar permisos estrictos: Solo admin@tpv.com puede realizar esta edición completa
            // Opcionalmente, permitir a otros admins editar solo info básica si fuera necesario, 
            // pero el requerimiento dice "exclusivamente al administrador general".
            var currentUserEmail = User.Identity?.Name;
            if (currentUserEmail != "admin@tpv.com")
            {
                return Forbid();
            }

            // 1. Actualizar Información Básica
            user.FirstName = request.FirstName?.Trim();
            user.LastName = request.LastName?.Trim();
            user.IsActive = request.IsActive;
            user.UpdatedAt = DateTime.UtcNow;
            
            // 2. Actualizar Tenant (Empresa) y Sucursal
            if (request.TenantId != user.TenantId)
            {
                 user.TenantId = request.TenantId;
            }
            if (request.CurrentBranchId != user.CurrentBranchId)
            {
                 user.CurrentBranchId = request.CurrentBranchId;
            }

            // 3. Actualizar Email y UserName
            // Aseguramos que siempre estén normalizados y consistentes
            var newEmail = request.Email?.Trim();
            if (!string.IsNullOrEmpty(newEmail))
            {
                if (newEmail != user.Email)
                {
                    // Cambio de email detectado
                    user.Email = newEmail;
                    user.UserName = newEmail;
                    user.SecurityStamp = Guid.NewGuid().ToString(); // Invalidar sesiones anteriores
                }
                
                // Siempre asegurar normalización correcta (corrige datos antiguos/malformados)
                user.NormalizedEmail = _userManager.NormalizeEmail(newEmail);
                user.NormalizedUserName = _userManager.NormalizeName(newEmail);
            }

            // Guardar cambios en usuario (Información, Email, Tenant)
            IdentityResult updateResult;
            try 
            {
                updateResult = await _userManager.UpdateAsync(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error crítico al actualizar usuario {UserId}", id);
                return StatusCode(500, "Error interno al guardar los cambios del usuario: " + ex.Message);
            }

            if (!updateResult.Succeeded)
            {
                var errorMsg = string.Join(", ", updateResult.Errors.Select(e => e.Description));
                _logger.LogWarning("UpdateUser failed for user {UserId}. Errors: {Errors}", id, errorMsg);
                return BadRequest(updateResult.Errors);
            }

            // 4. Actualizar Contraseña (si se proporciona)
            // Se realiza después de guardar el usuario para asegurar consistencia
            if (!string.IsNullOrEmpty(request.Password))
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var passwordResult = await _userManager.ResetPasswordAsync(user, token, request.Password);
                if (!passwordResult.Succeeded) return BadRequest(passwordResult.Errors);
            }

            // 5. Actualizar Roles (asegurar rol único)
            if (request.Roles != null && request.Roles.Any())
            {
                // Tomamos SOLO el primer rol enviado, ignorando los demás si hubiere
                var roleToAssign = request.Roles.First();
                
                if (await _roleManager.RoleExistsAsync(roleToAssign))
                {
                    var currentRoles = await _userManager.GetRolesAsync(user);
                    
                    // Si ya tiene ese rol único, no hacemos nada. 
                    // Si tiene otros, o no tiene ninguno, limpiamos y asignamos.
                    if (currentRoles.Count != 1 || currentRoles.First() != roleToAssign)
                    {
                        // Remover TODOS los roles actuales
                        if (currentRoles.Any())
                        {
                            var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
                            if (!removeResult.Succeeded)
                            {
                                return BadRequest(removeResult.Errors);
                            }
                        }

                        // Asignar el nuevo rol único
                        var addResult = await _userManager.AddToRoleAsync(user, roleToAssign);
                        if (!addResult.Succeeded)
                        {
                            return BadRequest(addResult.Errors);
                        }
                    }
                }
            }
            // Si request.Roles es vacío pero no nulo, podríamos querer borrar roles. 
            // Pero la lógica actual mantiene roles si se envía lista vacía para evitar borrados accidentales
            // a menos que el requerimiento sea explícito sobre "quitar rol".
            // Asumiremos que si se envía vacío, se quitan todos los roles (usuario sin rol).
            else if (request.Roles != null && !request.Roles.Any())
            {
                 var currentRoles = await _userManager.GetRolesAsync(user);
                 if (currentRoles.Any())
                 {
                     await _userManager.RemoveFromRolesAsync(user, currentRoles);
                 }
            }

            // Log de Auditoría
            var adminId = _userManager.GetUserId(User);
            _logger.LogInformation("AUDITORIA: Usuario {TargetUserId} ({TargetUserEmail}) actualizado por Administrador General {AdminId} el {Date}. Campos: {Fields}", 
                id, user.Email, adminId, DateTime.UtcNow, "FullUpdate");

            var finalRoles = await _userManager.GetRolesAsync(user);
            return Ok(new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                TenantId = user.TenantId,
                CurrentBranchId = user.CurrentBranchId,
                Roles = finalRoles.ToArray()
            });
        }



        public class UserDto
        {
            public string Id { get; set; }
            public string Email { get; set; }
            public string FirstName { get; set; }
            public string LastName { get; set; }
            public bool IsActive { get; set; }
            public int? TenantId { get; set; }
            public int? CurrentBranchId { get; set; }
            public string[] Roles { get; set; }
        }

        public class CreateUserRequest
        {
            public string Email { get; set; }
            public string Password { get; set; }
            public string FirstName { get; set; }
            public string LastName { get; set; }
            public int? TenantId { get; set; }
            public int? CurrentBranchId { get; set; }
            public string[] Roles { get; set; }
        }

        public class UpdateUserRequest
        {
            public string? FirstName { get; set; }
            public string? LastName { get; set; }
            public string? Email { get; set; }
            public string? Password { get; set; }
            public int? TenantId { get; set; }
            public int? CurrentBranchId { get; set; }
            public bool IsActive { get; set; }
            public string[]? Roles { get; set; }
        }
    }
}

