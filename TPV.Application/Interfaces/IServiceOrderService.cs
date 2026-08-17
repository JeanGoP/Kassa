using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IServiceOrderService
    {
        Task<ServiceOrderDto> CreateAsync(CreateServiceOrderDto dto, string userId);
        Task<ServiceOrderDto> GetByIdAsync(int id);
        Task<ServiceOrderWorkspaceDto> GetWorkspaceAsync(int id);
        Task<IEnumerable<ServiceOrderDto>> GetAllAsync(string search);
        Task<ServiceOrderDto> SetDiagnosisAsync(int id, ServiceOrderDiagnosisDto dto, string userId);
        Task<IEnumerable<ServiceOrderWorkDto>> GetWorksByOrderAsync(int serviceOrderId);
        Task<ServiceOrderWorkDto> AddWorkAsync(int serviceOrderId, CreateServiceOrderWorkDto dto);
        Task<ServiceOrderWorkDto> UpdateWorkAsync(int serviceOrderId, int workId, CreateServiceOrderWorkDto dto);
        Task<ServiceOrderWorkDto> UpdateWorkStatusAsync(int serviceOrderId, int workId, ServiceOrderWorkStatusDto dto);
        Task<IEnumerable<ServiceOrderPartDto>> GetPartsByOrderAsync(int serviceOrderId);
        Task<ServiceOrderPartsResultDto> ConfirmPartsAsync(int serviceOrderId, ConfirmServiceOrderPartsDto dto, string userId);
        Task<ServiceOrderDto> CloseOrderAsync(int serviceOrderId, CloseServiceOrderDto dto, string userId);
        Task<ServiceOrderDto> CancelOrderAsync(int serviceOrderId, CancelServiceOrderDto dto, string userId);
        Task<SaleResultDto> GenerateInvoiceAsync(int serviceOrderId, GenerateInvoiceDto dto, string userId);
    }
}
