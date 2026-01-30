using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IPurchaseService
    {
        Task<PurchaseDto> CreatePurchaseAsync(CreatePurchaseDto dto, string? userId);
        Task<IEnumerable<PurchaseDto>> GetAllAsync(string? search = null);
        Task<PurchaseDto?> GetByIdAsync(int id);
        Task<bool> DeleteAsync(int id, string? userId);
    }
}
