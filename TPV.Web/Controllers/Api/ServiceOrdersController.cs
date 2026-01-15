using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
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
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceOrderDto>> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPut("{id}/diagnosis")]
        public async Task<ActionResult<ServiceOrderDto>> SetDiagnosis(int id, ServiceOrderDiagnosisDto dto)
        {
            var result = await _service.SetDiagnosisAsync(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
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
            var result = await _service.AddWorkAsync(id, dto);
            if (result == null) return NotFound();
            return CreatedAtAction(nameof(GetWorks), new { id }, result);
        }

        [HttpPut("{id}/works/{workId}/status")]
        public async Task<ActionResult<ServiceOrderWorkDto>> UpdateWorkStatus(int id, int workId, ServiceOrderWorkStatusDto dto)
        {
            var result = await _service.UpdateWorkStatusAsync(id, workId, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }
    }
}
