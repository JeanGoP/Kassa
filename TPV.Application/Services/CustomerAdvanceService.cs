using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class CustomerAdvanceService : ICustomerAdvanceService
    {
        private const string Credit = "CONSTITUCION";
        private const string Application = "APLICACION";

        private readonly IRepository<CustomerAdvanceMovement> _movementRepository;
        private readonly IRepository<Customer> _customerRepository;

        public CustomerAdvanceService(
            IRepository<CustomerAdvanceMovement> movementRepository,
            IRepository<Customer> customerRepository)
        {
            _movementRepository = movementRepository;
            _customerRepository = customerRepository;
        }

        public async Task<decimal> GetBalanceAsync(int customerId)
        {
            var movements = await _movementRepository.GetAsync(m => m.CustomerId == customerId && m.IsActive);
            return CalculateBalance(movements);
        }

        public async Task<IEnumerable<CustomerAdvanceSummaryDto>> GetSummariesAsync(string? search = null)
        {
            var term = search?.Trim() ?? string.Empty;
            var movements = await _movementRepository.GetAsync(
                m => m.IsActive &&
                     (string.IsNullOrEmpty(term) ||
                      m.Customer.FirstName.Contains(term) ||
                      m.Customer.LastName.Contains(term) ||
                      (m.Customer.TaxId != null && m.Customer.TaxId.Contains(term))),
                null,
                "Customer");

            return movements
                .GroupBy(m => m.CustomerId)
                .Select(group =>
                {
                    var latest = group.OrderByDescending(m => m.Date).ThenByDescending(m => m.Id).First();
                    return new CustomerAdvanceSummaryDto
                    {
                        CustomerId = group.Key,
                        CustomerName = $"{latest.Customer.FirstName} {latest.Customer.LastName}".Trim(),
                        IdentificationType = latest.Customer.IdentificationType,
                        TaxId = latest.Customer.TaxId,
                        Balance = CalculateBalance(group),
                        LastMovementAt = latest.Date
                    };
                })
                .OrderByDescending(summary => summary.LastMovementAt)
                .ThenBy(summary => summary.CustomerName)
                .ToList();
        }

        public async Task<CustomerAdvanceAccountDto?> GetAccountAsync(int customerId)
        {
            var customer = await _customerRepository.GetByIdAsync(customerId);
            if (customer == null) return null;

            var movements = await _movementRepository.GetAsync(
                m => m.CustomerId == customerId && m.IsActive,
                q => q.OrderBy(m => m.Date).ThenBy(m => m.Id),
                "Branch,Sale");

            var runningBalance = 0m;
            var mapped = new List<CustomerAdvanceMovementDto>();
            foreach (var movement in movements)
            {
                var signedAmount = SignedAmount(movement);
                runningBalance += signedAmount;
                mapped.Add(MapMovement(movement, signedAmount, runningBalance));
            }

            return new CustomerAdvanceAccountDto
            {
                Customer = new CustomerAdvanceSummaryDto
                {
                    CustomerId = customer.Id,
                    CustomerName = $"{customer.FirstName} {customer.LastName}".Trim(),
                    IdentificationType = customer.IdentificationType,
                    TaxId = customer.TaxId,
                    Balance = runningBalance,
                    LastMovementAt = movements.LastOrDefault()?.Date
                },
                Movements = mapped.OrderByDescending(m => m.Date).ThenByDescending(m => m.Id).ToList()
            };
        }

        public async Task<CustomerAdvanceMovementDto> RegisterCreditAsync(int customerId, int branchId, int saleId, decimal amount, string paymentMethod, string reference, string? notes, string userId)
        {
            await EnsureCustomerAsync(customerId);
            ValidateAmount(amount);
            var movement = await _movementRepository.AddAsync(new CustomerAdvanceMovement
            {
                CustomerId = customerId,
                BranchId = branchId,
                SaleId = saleId,
                Date = DateTime.UtcNow,
                MovementType = Credit,
                Amount = decimal.Round(amount, 2),
                PaymentMethod = Clean(paymentMethod) ?? "SIN_DEFINIR",
                Reference = Clean(reference) ?? $"VENTA-{saleId}",
                Notes = Clean(notes),
                CreatedByUserId = userId
            });

            var balance = await GetBalanceAsync(customerId);
            return MapMovement(movement, movement.Amount, balance);
        }

        public async Task<CustomerAdvanceMovementDto> RegisterApplicationAsync(int customerId, int branchId, int saleId, decimal amount, string reference, string? notes, string userId)
        {
            await EnsureCustomerAsync(customerId);
            ValidateAmount(amount);
            var balance = await GetBalanceAsync(customerId);
            if (amount > balance)
                throw new InvalidOperationException($"El anticipo disponible es {balance:N2} y no alcanza para aplicar {amount:N2}.");

            var movement = await _movementRepository.AddAsync(new CustomerAdvanceMovement
            {
                CustomerId = customerId,
                BranchId = branchId,
                SaleId = saleId,
                Date = DateTime.UtcNow,
                MovementType = Application,
                Amount = decimal.Round(amount, 2),
                PaymentMethod = "ANTICIPO",
                Reference = Clean(reference) ?? $"VENTA-{saleId}",
                Notes = Clean(notes),
                CreatedByUserId = userId
            });

            return MapMovement(movement, -movement.Amount, balance - movement.Amount);
        }

        private async Task EnsureCustomerAsync(int customerId)
        {
            if (await _customerRepository.GetByIdAsync(customerId) == null)
                throw new InvalidOperationException("El cliente del anticipo no existe.");
        }

        private static decimal CalculateBalance(IEnumerable<CustomerAdvanceMovement> movements) =>
            decimal.Round(movements.Sum(SignedAmount), 2);

        private static decimal SignedAmount(CustomerAdvanceMovement movement) =>
            movement.MovementType == Credit ? movement.Amount : -movement.Amount;

        private static CustomerAdvanceMovementDto MapMovement(CustomerAdvanceMovement movement, decimal signedAmount, decimal balanceAfter) => new()
        {
            Id = movement.Id,
            Date = movement.Date,
            MovementType = movement.MovementType,
            Amount = movement.Amount,
            SignedAmount = signedAmount,
            BalanceAfter = balanceAfter,
            BranchId = movement.BranchId,
            BranchName = movement.Branch?.Name ?? string.Empty,
            SaleId = movement.SaleId,
            InvoiceNumber = movement.Sale?.InvoiceNumber,
            PaymentMethod = movement.PaymentMethod,
            Reference = movement.Reference,
            Notes = movement.Notes
        };

        private static void ValidateAmount(decimal amount)
        {
            if (amount <= 0) throw new InvalidOperationException("El valor del anticipo debe ser mayor que cero.");
        }

        private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
