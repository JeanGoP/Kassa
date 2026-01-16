using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using TPV.Infrastructure.Identity;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;

        public AuthController(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager)
        {
            _signInManager = signInManager;
            _userManager = userManager;
        }

        [HttpPost("login")]
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
                return Ok(new { message = "Inicio de sesión exitoso.", user = new { user.Email, user.Id } });
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
                return Ok(new { user.Email, user.Id });
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
}
