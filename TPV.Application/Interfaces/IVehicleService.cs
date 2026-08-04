using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IVehicleService
    {
        Task<IEnumerable<VehicleDto>> GetAllAsync(string? search);
        Task<VehicleDto?> GetByIdAsync(int id);
        Task<VehicleDto> CreateAsync(CreateVehicleDto dto, string userId);
        Task<VehicleDto?> UpdateAsync(int id, CreateVehicleDto dto, string userId);
        Task<bool> DeactivateAsync(int id, string userId);
        Task<int> RegisterOperationAsync(RegisterVehicleOperationDto dto);
    }
}
