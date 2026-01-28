using System;
using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Sale : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime Date { get; set; } = DateTime.Now;
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

        // Electronic Invoicing Fields
        public string? ElectronicInvoiceId { get; set; } // ID from the provider
        public string? Cufe { get; set; }
        public string? QrCode { get; set; }
        public string ElectronicInvoicingStatus { get; set; } = "Pending"; // Pending, Sent, Error

        public ICollection<SaleDetail> SaleDetails { get; set; }
    }
}
