using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface ICustomerAdvanceService
    {
        Task<decimal> GetBalanceAsync(int customerId);
        Task<IEnumerable<CustomerAdvanceSummaryDto>> GetSummariesAsync(string? search = null);
        Task<CustomerAdvanceAccountDto?> GetAccountAsync(int customerId);
        Task<CustomerAdvanceMovementDto> RegisterCreditAsync(int customerId, int branchId, int saleId, decimal amount, string paymentMethod, string reference, string? notes, string userId);
        Task<CustomerAdvanceMovementDto> RegisterApplicationAsync(int customerId, int branchId, int saleId, decimal amount, string reference, string? notes, string userId);
    }
}
