using System.Collections.Generic;

namespace TPV.Application.DTOs
{
    public class WorkshopDashboardDto
    {
        public int VehiclesInWorkshop { get; set; }
        public int OpenOrders { get; set; }
        public int CompletedOrdersToday { get; set; }
        public decimal MonthlyRevenue { get; set; }
        public decimal TotalRevenue { get; set; } // New: Total Sales Revenue
        public int LowStockCount { get; set; }    // New: Low Stock Items
        public int NewCustomersCount { get; set; } // New: New Customers this month
        public List<OrderStatusStatDto> OrderStatusStats { get; set; } = new List<OrderStatusStatDto>();
        public List<RevenueExpenseStatDto> RevenueExpenseStats { get; set; } = new List<RevenueExpenseStatDto>();
        public List<RecentOrderDto> RecentOrders { get; set; } = new List<RecentOrderDto>();
    }

    public class OrderStatusStatDto
    {
        public string Status { get; set; }
        public int Count { get; set; }
    }

    public class RevenueExpenseStatDto
    {
        public string Date { get; set; }
        public decimal Income { get; set; }
        public decimal Expense { get; set; }
    }

    public class RecentOrderDto
    {
        public int Id { get; set; }
        public string CustomerName { get; set; }
        public string VehicleInfo { get; set; }
        public string Status { get; set; }
        public decimal Total { get; set; }
    }
}
