using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface ISalesService
    {
        Task<SaleResultDto> CreateSaleAsync(SaleCreateDto dto, string userId);
        Task<SaleResultDto> GetSaleAsync(int saleId);
        Task<IEnumerable<SaleResultDto>> GetSalesAsync(DateTime? fromDate, DateTime? toDate, string? invoiceNumber, string? customerName);
        Task<SaleResultDto> EmitInvoiceAsync(int saleId);
        Task<SaleAdjustmentDto> CreateAdjustmentAsync(int saleId, CreateSaleAdjustmentDto dto, string userId);
    }
}

