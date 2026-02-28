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
    public class WorkshopDashboardService : IWorkshopDashboardService
    {
        private readonly IRepository<ServiceOrder> _orderRepository;
        private readonly IRepository<ServiceOrderWork> _workRepository;
        private readonly IRepository<Purchase> _purchaseRepository;
        private readonly IRepository<Customer> _customerRepository;
        private readonly IRepository<Sale> _saleRepository;
        private readonly IRepository<Stock> _stockRepository;

        public WorkshopDashboardService(
            IRepository<ServiceOrder> orderRepository,
            IRepository<ServiceOrderWork> workRepository,
            IRepository<Purchase> purchaseRepository,
            IRepository<Customer> customerRepository,
            IRepository<Sale> saleRepository,
            IRepository<Stock> stockRepository)
        {
            _orderRepository = orderRepository;
            _workRepository = workRepository;
            _purchaseRepository = purchaseRepository;
            _customerRepository = customerRepository;
            _saleRepository = saleRepository;
            _stockRepository = stockRepository;
        }

        public async Task<WorkshopDashboardDto> GetDashboardDataAsync()
        {
            var now = DateTime.Now;
            var today = now.Date;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var last7Days = today.AddDays(-6);

            // 1. Fetch relevant orders
            var allOrders = await _orderRepository.GetAllAsync();
            var activeOrders = allOrders.Where(o => o.Status != "FINALIZADA" && o.Status != "CANCELADA").ToList();
            
            var vehiclesInWorkshop = activeOrders.Count;
            // Open Orders: Those not finalized/canceled
            var openOrders = activeOrders.Count; 
            var completedToday = allOrders.Count(o => o.Status == "FINALIZADA" && o.UpdatedAt.HasValue && o.UpdatedAt.Value.Date == today);

            // 2. Real Data: Total Revenue (Sales)
            var monthlySales = await _saleRepository.GetAsync(s => s.Date >= startOfMonth);
            var totalRevenue = monthlySales.Sum(s => s.TotalAmount);

            // 3. Real Data: Low Stock
            // Assuming MinStockLevel is set. If 0, maybe ignore? or count if Quantity <= 0?
            // Usually Quantity <= MinStockLevel.
            var allStocks = await _stockRepository.GetAllAsync(); 
            var lowStockCount = allStocks.Count(s => s.Quantity <= s.MinStockLevel);

            // 4. Real Data: New Customers
            var newCustomers = await _customerRepository.GetAsync(c => c.CreatedAt >= startOfMonth);
            var newCustomersCount = newCustomers.Count();

            // 5. Order Status Stats
            var statusStats = allOrders
                .GroupBy(o => o.Status)
                .Select(g => new OrderStatusStatDto
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToList();

            // 6. Revenue vs Expenses (Last 7 Days)
            var revenueExpenseStats = new List<RevenueExpenseStatDto>();
            var recentPurchases = await _purchaseRepository.GetAsync(p => p.Date >= last7Days);
            var recentSales = await _saleRepository.GetAsync(s => s.Date >= last7Days);

            for (int i = 0; i < 7; i++)
            {
                var date = last7Days.AddDays(i);
                var dateStr = date.ToString("yyyy-MM-dd");

                var income = recentSales.Where(s => s.Date.Date == date).Sum(s => s.TotalAmount);
                var expense = recentPurchases.Where(p => p.Date.Date == date).Sum(p => p.TotalAmount);

                revenueExpenseStats.Add(new RevenueExpenseStatDto
                {
                    Date = dateStr,
                    Income = income,
                    Expense = expense
                });
            }

            // 7. Recent Orders (Top 5)
            var recent5Orders = allOrders.OrderByDescending(o => o.IntakeDateTime).Take(5).ToList();
            var recent5Dtos = new List<RecentOrderDto>();
            
            if (recent5Orders.Any())
            {
                var customerIds = recent5Orders.Select(o => o.CustomerId).Distinct().ToList();
                var customers = await _customerRepository.GetAsync(c => customerIds.Contains(c.Id));
                var recent5Ids = recent5Orders.Select(o => o.Id).ToList();
                // We still need Works to calculate "Total" if no Sale exists yet?
                // Or should we use Sale if exists?
                // For Service Orders, "Total" is usually Sum of Works Labor + Parts?
                // Or maybe just show LaborCost for now as before?
                // The previous code summed LaborCost from Works.
                // Let's stick to that for "Order Value" unless we link to Sale.
                var recent5Works = await _workRepository.GetAsync(w => recent5Ids.Contains(w.ServiceOrderId));
                
                foreach (var order in recent5Orders)
                {
                    var customer = customers.FirstOrDefault(c => c.Id == order.CustomerId);
                    var total = recent5Works.Where(w => w.ServiceOrderId == order.Id).Sum(w => w.LaborCost);

                    recent5Dtos.Add(new RecentOrderDto
                    {
                        Id = order.Id,
                        CustomerName = customer != null ? $"{customer.FirstName} {customer.LastName}" : "Unknown",
                        VehicleInfo = $"{order.Brand} {order.Model} {order.Year}",
                        Status = order.Status,
                        Total = total
                    });
                }
            }

            return new WorkshopDashboardDto
            {
                VehiclesInWorkshop = vehiclesInWorkshop,
                OpenOrders = openOrders,
                CompletedOrdersToday = completedToday,
                MonthlyRevenue = totalRevenue, // Use Total Sales Revenue
                TotalRevenue = totalRevenue,
                LowStockCount = lowStockCount,
                NewCustomersCount = newCustomersCount,
                OrderStatusStats = statusStats,
                RevenueExpenseStats = revenueExpenseStats,
                RecentOrders = recent5Dtos
            };
        }
    }
}
