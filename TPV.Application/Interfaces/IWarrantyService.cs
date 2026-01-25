using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IWarrantyService
    {
        Task<IEnumerable<WarrantyDto>> GetAllAsync(string? plate = null);
        Task<WarrantyDto> GetByIdAsync(int id);
        Task<WarrantyDto> CreateAsync(CreateWarrantyDto dto);
        Task UpdateAsync(int id, CreateWarrantyDto dto);
        Task DeleteAsync(int id);
        Task<IEnumerable<WarrantyDto>> GetActiveWarrantiesByPlateAsync(string plate);
    }
}