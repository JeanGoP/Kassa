using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IQuotationService
    {
        Task<QuotationSearchResultDto> SearchAsync(string searchTerm, string? userId);
        Task<IEnumerable<QuotationSearchHistoryDto>> GetHistoryAsync(DateTime? date = null);
        Task<QuotationDto> CreateAsync(CreateQuotationDto dto, string? userId);
        Task<QuotationDto?> GetByIdAsync(int id);
        Task<IEnumerable<QuotationDto>> GetQuotationsAsync(DateTime? start = null, DateTime? end = null, string? search = null);
    }
}
