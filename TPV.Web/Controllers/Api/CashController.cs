using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TPV.Application.Interfaces;
using TPV.Application.DTOs;
using System.Security.Claims;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CashController : ControllerBase
    {
        private readonly ICashService _cashService;

        public CashController(ICashService cashService)
        {
            _cashService = cashService;
        }

        [HttpPost("open")]
        public async Task<IActionResult> OpenSession([FromBody] OpenSessionRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            // Default branch to 1 if not provided
            var branchId = request.BranchId == 0 ? 1 : request.BranchId;

            var session = await _cashService.OpenSessionAsync(branchId, userId, request.InitialBalance);
            return Ok(session);
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            // Assuming Branch 1 for now
            var status = await _cashService.GetOpenSessionAsync(1, userId);
            if (status == null) return NotFound("No active session");
            return Ok(status);
        }

        [HttpPost("close")]
        public async Task<IActionResult> CloseSession([FromBody] CloseSessionRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            // Find the open session first
            var session = await _cashService.GetOpenSessionAsync(1, userId);
            if (session == null) return BadRequest("No active session to close");

            var result = await _cashService.CloseSessionAsync(session.Id, request.FinalBalance);
            return Ok(result);
        }
    }

    public class OpenSessionRequest
    {
        public int BranchId { get; set; }
        public decimal InitialBalance { get; set; }
    }

    public class CloseSessionRequest
    {
        public decimal FinalBalance { get; set; }
    }
}
