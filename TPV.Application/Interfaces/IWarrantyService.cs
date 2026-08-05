using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IWarrantyService
    {
        Task<IEnumerable<WarrantyDto>> GetAllAsync(string? plate = null);
        Task<WarrantyDto> GetByIdAsync(int id);
        Task<WarrantyDto> CreateAsync(CreateWarrantyDto dto, string userId);
        Task<WarrantyDto?> UpdateAsync(int id, CreateWarrantyDto dto, string userId);
        Task DeleteAsync(int id);
        Task<IEnumerable<WarrantyDto>> GetActiveWarrantiesByPlateAsync(string plate);
    }
}
