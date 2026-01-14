using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IPurchaseService
    {
        Task<PurchaseDto> CreatePurchaseAsync(CreatePurchaseDto dto);
        Task<IEnumerable<PurchaseDto>> GetAllAsync();
        Task<PurchaseDto?> GetByIdAsync(int id);
    }
}