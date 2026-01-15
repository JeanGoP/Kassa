using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;

namespace TPV.Web.Controllers.Api
{
    [Route("api/workshop-dashboard")]
    [ApiController]
    public class WorkshopDashboardController : ControllerBase
    {
        private readonly IWorkshopDashboardService _dashboardService;

        public WorkshopDashboardController(IWorkshopDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet]
        public async Task<ActionResult<WorkshopDashboardDto>> GetDashboardData()
        {
            var data = await _dashboardService.GetDashboardDataAsync();
            return Ok(data);
        }
    }
}
