using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ServiceOrdersController : ControllerBase
    {
        private readonly IServiceOrderService _service;

        public ServiceOrdersController(IServiceOrderService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ServiceOrderDto>>> GetAll([FromQuery] string? search)
        {
            var result = await _service.GetAllAsync(search ?? string.Empty);
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<ServiceOrderDto>> Create(CreateServiceOrderDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            try
            {
                var result = await _service.CreateAsync(dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceOrderDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpGet("{id}/workspace")]
        public async Task<ActionResult<ServiceOrderWorkspaceDto>> GetWorkspace(int id)
        {
            var result = await _service.GetWorkspaceAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPut("{id}/diagnosis")]
        public async Task<ActionResult<ServiceOrderDto>> SetDiagnosis(int id, ServiceOrderDiagnosisDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            try
            {
                var result = await _service.SetDiagnosisAsync(id, dto, userId);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}/works")]
        public async Task<ActionResult<IEnumerable<ServiceOrderWorkDto>>> GetWorks(int id)
        {
            var result = await _service.GetWorksByOrderAsync(id);
            return Ok(result);
        }

        [HttpPost("{id}/works")]
        public async Task<ActionResult<ServiceOrderWorkDto>> AddWork(int id, CreateServiceOrderWorkDto dto)
        {
            try
            {
                var result = await _service.AddWorkAsync(id, dto);
                if (result == null) return NotFound();
                return CreatedAtAction(nameof(GetWorks), new { id }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/works/{workId}")]
        public async Task<ActionResult<ServiceOrderWorkDto>> UpdateWork(int id, int workId, CreateServiceOrderWorkDto dto)
        {
            try
            {
                var result = await _service.UpdateWorkAsync(id, workId, dto);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/works/{workId}/status")]
        public async Task<ActionResult<ServiceOrderWorkDto>> UpdateWorkStatus(int id, int workId, ServiceOrderWorkStatusDto dto)
        {
            try
            {
                var result = await _service.UpdateWorkStatusAsync(id, workId, dto);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}/parts")]
        public async Task<ActionResult<IEnumerable<ServiceOrderPartDto>>> GetParts(int id)
        {
            var result = await _service.GetPartsByOrderAsync(id);
            return Ok(result);
        }

        [HttpPost("{id}/parts/confirm")]
        public async Task<ActionResult<ServiceOrderPartsResultDto>> ConfirmParts(int id, ConfirmServiceOrderPartsDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            try
            {
                var result = await _service.ConfirmPartsAsync(id, dto, userId);
                if (result == null) return NotFound();
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error interno al confirmar repuestos.", details = ex.Message });
            }
        }

        [HttpPut("{id}/close")]
        public async Task<ActionResult<ServiceOrderDto>> CloseOrder(int id, CloseServiceOrderDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            try
            {
                var result = await _service.CloseOrderAsync(id, dto, userId);
                if (result == null) return BadRequest(new { message = "No se pudo cerrar la orden. Verifique el estado y el checklist." });
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/cancel")]
        public async Task<ActionResult<ServiceOrderDto>> CancelOrder(int id, CancelServiceOrderDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            try
            {
                var result = await _service.CancelOrderAsync(id, dto, userId);
                return result == null ? NotFound() : Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/invoice")]
        public async Task<ActionResult<SaleResultDto>> GenerateInvoice(int id, [FromBody] GenerateInvoiceDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            try
            {
                var result = await _service.GenerateInvoiceAsync(id, dto, userId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
        }
    }
}
