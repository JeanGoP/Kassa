using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IPreparationOrderService
    {
        Task<IEnumerable<PreparationOrderDto>> GetAllAsync(string? search);
        Task<PreparationOrderDto?> GetByIdAsync(int id);
        Task<PreparationOrderDto> CreateAsync(CreatePreparationOrderDto dto, string userId);
        Task<PreparationOrderDto?> UpdateAsync(int id, UpdatePreparationOrderDto dto, string userId);
        Task<PreparationOrderDto?> CompleteAsync(int id, CompletePreparationOrderDto dto, string userId);
        Task<bool> DeleteAsync(int id, string userId);
    }
}
