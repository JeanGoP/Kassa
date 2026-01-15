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

        public WorkshopDashboardService(
            IRepository<ServiceOrder> orderRepository,
            IRepository<ServiceOrderWork> workRepository,
            IRepository<Purchase> purchaseRepository,
            IRepository<Customer> customerRepository)
        {
            _orderRepository = orderRepository;
            _workRepository = workRepository;
            _purchaseRepository = purchaseRepository;
            _customerRepository = customerRepository;
        }

        public async Task<WorkshopDashboardDto> GetDashboardDataAsync()
        {
            var now = DateTime.UtcNow; // Or local time if configured, using Utc for now
            var today = now.Date;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var last7Days = today.AddDays(-6);

            // 1. Fetch relevant orders
            // Active orders: Status NOT Finalizada/Cancelada
            var allOrders = await _orderRepository.GetAllAsync(); // Depending on volume, might be better to filter in DB
            // Assuming "FINALIZADA" and "CANCELADA" are the closing statuses
            var activeOrders = allOrders.Where(o => o.Status != "FINALIZADA" && o.Status != "CANCELADA").ToList();
            
            var vehiclesInWorkshop = activeOrders.Count;
            var openOrders = activeOrders.Count(o => o.Status == "PENDIENTE" || o.Status == "EN PROCESO" || o.Status == "EN DIAGNOSTICO" || o.Status == "EN ESPERA");

            // Completed Today
            var completedToday = allOrders.Count(o => o.Status == "FINALIZADA" && o.UpdatedAt.HasValue && o.UpdatedAt.Value.Date == today);

            // 2. Calculate Monthly Revenue (Orders finalized this month)
            var monthlyCompletedOrders = allOrders
                .Where(o => o.Status == "FINALIZADA" && o.UpdatedAt.HasValue && o.UpdatedAt.Value >= startOfMonth)
                .ToList();

            decimal monthlyRevenue = 0;
            if (monthlyCompletedOrders.Any())
            {
                var monthlyOrderIds = monthlyCompletedOrders.Select(o => o.Id).ToList();
                var works = await _workRepository.GetAsync(w => monthlyOrderIds.Contains(w.ServiceOrderId));
                monthlyRevenue = works.Sum(w => w.LaborCost);
            }

            // 3. Order Status Stats
            var statusStats = allOrders
                .GroupBy(o => o.Status)
                .Select(g => new OrderStatusStatDto
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToList();

            // 4. Revenue vs Expenses (Last 7 Days)
            var revenueExpenseStats = new List<RevenueExpenseStatDto>();
            var recentPurchases = await _purchaseRepository.GetAsync(p => p.Date >= last7Days);
            
            // Get orders finalized in last 7 days
            var recentFinalizedOrders = allOrders
                .Where(o => o.Status == "FINALIZADA" && o.UpdatedAt.HasValue && o.UpdatedAt.Value.Date >= last7Days)
                .ToList();
            var recentOrderIds = recentFinalizedOrders.Select(o => o.Id).ToList();
            var recentWorks = await _workRepository.GetAsync(w => recentOrderIds.Contains(w.ServiceOrderId));

            for (int i = 0; i < 7; i++)
            {
                var date = last7Days.AddDays(i);
                var dateStr = date.ToString("yyyy-MM-dd");

                // Revenue: Sum of works for orders finalized on this date
                var ordersOnDate = recentFinalizedOrders.Where(o => o.UpdatedAt.Value.Date == date).Select(o => o.Id).ToList();
                var revenue = recentWorks.Where(w => ordersOnDate.Contains(w.ServiceOrderId)).Sum(w => w.LaborCost);

                // Expense: Sum of purchases on this date
                var expense = recentPurchases.Where(p => p.Date.Date == date).Sum(p => p.TotalAmount);

                revenueExpenseStats.Add(new RevenueExpenseStatDto
                {
                    Date = dateStr,
                    Income = revenue,
                    Expense = expense
                });
            }

            // 5. Recent Orders (Top 5)
            var recent5Orders = allOrders.OrderByDescending(o => o.IntakeDateTime).Take(5).ToList();
            var recent5Dtos = new List<RecentOrderDto>();
            
            if (recent5Orders.Any())
            {
                var recent5Ids = recent5Orders.Select(o => o.Id).ToList();
                var recent5Works = await _workRepository.GetAsync(w => recent5Ids.Contains(w.ServiceOrderId));
                
                // Need customer names
                // This might be inefficient loop, but for 5 items it's fine.
                // Or I can fetch all customers? No, that's too many.
                // I'll use _customerRepository.GetByIdAsync inside loop or pre-fetch if possible.
                // Since I have _customerRepository, I'll just loop.
                
                foreach (var order in recent5Orders)
                {
                    var customer = await _customerRepository.GetByIdAsync(order.CustomerId);
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
                MonthlyRevenue = monthlyRevenue,
                OrderStatusStats = statusStats,
                RevenueExpenseStats = revenueExpenseStats,
                RecentOrders = recent5Dtos
            };
        }
    }
}
