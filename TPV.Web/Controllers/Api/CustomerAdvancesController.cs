using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TPV.Application.Interfaces;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CustomerAdvancesController : ControllerBase
    {
        private readonly ICustomerAdvanceService _service;

        public CustomerAdvancesController(ICustomerAdvanceService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search)
        {
            return Ok(await _service.GetSummariesAsync(search));
        }

        [HttpGet("customer/{customerId:int}")]
        public async Task<IActionResult> GetCustomerAccount(int customerId)
        {
            var account = await _service.GetAccountAsync(customerId);
            return account == null ? NotFound() : Ok(account);
        }

        [HttpGet("customer/{customerId:int}/balance")]
        public async Task<IActionResult> GetCustomerBalance(int customerId)
        {
            return Ok(new { customerId, balance = await _service.GetBalanceAsync(customerId) });
        }
    }
}
