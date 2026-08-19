using System;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class CashService : ICashService
    {
        private readonly IRepository<CashSession> _cashRepository;
        private readonly IRepository<Sale> _saleRepository;

        public CashService(IRepository<CashSession> cashRepository, IRepository<Sale> saleRepository)
        {
            _cashRepository = cashRepository;
            _saleRepository = saleRepository;
        }

        public async Task<CashSessionDto> OpenSessionAsync(int branchId, string userId, decimal openingBalance)
        {
            var existing = await GetOpenSessionAsync(branchId, userId);
            if (existing != null) return existing;

            var session = new CashSession
            {
                BranchId = branchId,
                UserId = userId,
                OpeningTime = DateTime.Now,
                OpeningBalance = openingBalance,
                ClosingBalance = 0,
                TotalSystemSales = 0,
                Difference = 0,
                IsClosed = false
            };

            session = await _cashRepository.AddAsync(session);
            return Map(session);
        }

        public async Task<CashSessionDto> GetOpenSessionAsync(int branchId, string userId)
        {
            var sessions = await _cashRepository.GetAsync(s => s.BranchId == branchId && s.UserId == userId && !s.IsClosed);
            var session = sessions.FirstOrDefault();
            return session == null ? null : Map(session);
        }

        public async Task<CashSessionDto> CloseSessionAsync(int sessionId, decimal closingBalance)
        {
            var session = await _cashRepository.GetByIdAsync(sessionId);
            if (session == null || session.IsClosed) return session == null ? null : Map(session);

            var sales = await _saleRepository.GetAsync(s => s.BranchId == session.BranchId && s.Date >= session.OpeningTime);
            var totalSales = sales.Sum(s => (s.AmountReceived ?? s.TotalAmount) - s.ChangeAmount);

            session.ClosingTime = DateTime.Now;
            session.ClosingBalance = closingBalance;
            session.TotalSystemSales = totalSales;
            session.Difference = closingBalance - (session.OpeningBalance + totalSales);
            session.IsClosed = true;

            await _cashRepository.UpdateAsync(session);
            return Map(session);
        }

        private CashSessionDto Map(CashSession s) => new CashSessionDto
        {
            Id = s.Id,
            BranchId = s.BranchId,
            UserId = s.UserId,
            OpeningTime = s.OpeningTime,
            ClosingTime = s.ClosingTime,
            OpeningBalance = s.OpeningBalance,
            ClosingBalance = s.ClosingBalance,
            TotalSystemSales = s.TotalSystemSales,
            Difference = s.Difference,
            IsClosed = s.IsClosed
        };
    }
}
