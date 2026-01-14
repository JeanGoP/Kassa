using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface ISalesService
    {
        Task<SaleResultDto> CreateSaleAsync(SaleCreateDto dto, string userId);
        Task<SaleResultDto> GetSaleAsync(int saleId);
    }
}

