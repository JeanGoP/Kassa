using System;
using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Sale : BaseEntity
    {
        public string InvoiceNumber { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public decimal TotalAmount { get; set; }
        public string PaymentMethod { get; set; } // Efectivo, Tarjeta, etc.

        public int? CustomerId { get; set; }
        public Customer Customer { get; set; }

        public int BranchId { get; set; }
        public Branch Branch { get; set; }

        // UserId string for Identity integration later
        public string UserId { get; set; } 
        
        public int? ServiceOrderId { get; set; }
        public ServiceOrder ServiceOrder { get; set; }

        public ICollection<SaleDetail> SaleDetails { get; set; }
    }
}
