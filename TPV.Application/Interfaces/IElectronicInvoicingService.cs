using System.Threading.Tasks;
using TPV.Domain.Entities;
using TPV.Application.DTOs.ElectronicInvoicing;

namespace TPV.Application.Interfaces
{
    public interface IElectronicInvoicingService
    {
        Task<MatiasResponseDto> GenerateInvoiceAsync(Sale sale);
    }
}
