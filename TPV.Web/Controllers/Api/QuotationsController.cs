using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
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
    public class QuotationsController : ControllerBase
    {
        private readonly IQuotationService _quotationService;

        public QuotationsController(IQuotationService quotationService)
        {
            _quotationService = quotationService;
        }

        [HttpGet("search")]
        public async Task<ActionResult<QuotationSearchResultDto>> Search([FromQuery] string term)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                return Ok(await _quotationService.SearchAsync(term, userId));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<QuotationSearchHistoryDto>>> GetHistory([FromQuery] DateTime? date)
        {
            return Ok(await _quotationService.GetHistoryAsync(date));
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuotationDto>>> GetQuotations(
            [FromQuery] DateTime? start,
            [FromQuery] DateTime? end,
            [FromQuery] string? search)
        {
            return Ok(await _quotationService.GetQuotationsAsync(start, end, search));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<QuotationDto>> GetById(int id)
        {
            var quotation = await _quotationService.GetByIdAsync(id);
            if (quotation == null) return NotFound();
            return Ok(quotation);
        }

        [HttpPost]
        public async Task<ActionResult<QuotationDto>> Create([FromBody] CreateQuotationDto dto)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var quotation = await _quotationService.CreateAsync(dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = quotation.Id }, quotation);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
