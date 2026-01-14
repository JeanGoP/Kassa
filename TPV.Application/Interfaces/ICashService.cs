using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface ICashService
    {
        Task<CashSessionDto> OpenSessionAsync(int branchId, string userId, decimal openingBalance);
        Task<CashSessionDto> GetOpenSessionAsync(int branchId, string userId);
        Task<CashSessionDto> CloseSessionAsync(int sessionId, decimal closingBalance);
    }
}

