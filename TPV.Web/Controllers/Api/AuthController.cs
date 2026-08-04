using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using TPV.Infrastructure.Identity;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AuthController : ControllerBase
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;

        public AuthController(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager)
        {
            _signInManager = signInManager;
            _userManager = userManager;
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (string.IsNullOrEmpty(request.CurrentPassword) || string.IsNullOrEmpty(request.NewPassword) || string.IsNullOrEmpty(request.ConfirmNewPassword))
            {
                return BadRequest("Todos los campos son obligatorios.");
            }

            if (request.NewPassword != request.ConfirmNewPassword)
            {
                return BadRequest("La nueva contraseña y su confirmación no coinciden.");
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            // Simulación de envío de correo
            // _emailSender.SendEmailAsync(user.Email, "Cambio de Contraseña", "Su contraseña ha sido actualizada exitosamente.");
            Console.WriteLine($"[EMAIL MOCK] Enviando correo a {user.Email}: Su contraseña ha sido actualizada exitosamente.");

            return Ok(new { message = "Contraseña actualizada correctamente. Se ha enviado una notificación a su correo." });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest("El correo electrónico y la contraseña son obligatorios.");
            }

            var result = await _signInManager.PasswordSignInAsync(request.Email, request.Password, request.RememberMe, lockoutOnFailure: false);

            if (result.Succeeded)
            {
                var user = await _userManager.FindByEmailAsync(request.Email);
                
                // Generar el principal para obtener los claims completos (incluyendo roles y permisos)
                var principal = await _signInManager.CreateUserPrincipalAsync(user);
                var permissions = principal.FindAll("permission").Select(c => c.Value).ToList();
                var roles = await _userManager.GetRolesAsync(user);

                return Ok(new { 
                    message = "Inicio de sesión exitoso.", 
                    user = new { 
                        user.Email, 
                        user.Id,
                        user.TenantId,
                        Permissions = permissions,
                        Roles = roles
                    } 
                });
            }

            return Unauthorized("Intento de inicio de sesión no válido. Verifique sus credenciales.");
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return Ok(new { message = "Sesión cerrada correctamente." });
        }

        [HttpGet("user")]
        public async Task<IActionResult> GetUser()
        {
            if (User.Identity.IsAuthenticated)
            {
                var user = await _userManager.GetUserAsync(User);
                var permissions = User.FindAll("permission").Select(c => c.Value).ToList();
                var roles = User.FindAll(System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToList();

                return Ok(new { 
                    user.Email, 
                    user.Id,
                    user.TenantId,
                    Permissions = permissions,
                    Roles = roles
                });
            }
            return Unauthorized();
        }
    }

    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
        public bool RememberMe { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
        public string ConfirmNewPassword { get; set; }
    }
}
