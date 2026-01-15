using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IWorkshopDashboardService
    {
        Task<WorkshopDashboardDto> GetDashboardDataAsync();
    }
}
