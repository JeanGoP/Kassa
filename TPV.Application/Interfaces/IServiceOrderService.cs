using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IServiceOrderService
    {
        Task<ServiceOrderDto> CreateAsync(CreateServiceOrderDto dto);
        Task<ServiceOrderDto> GetByIdAsync(int id);
        Task<IEnumerable<ServiceOrderDto>> GetAllAsync(string search);
    }
}
