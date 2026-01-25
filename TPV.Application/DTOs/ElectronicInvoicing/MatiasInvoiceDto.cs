using System.Collections.Generic;

namespace TPV.Application.DTOs.ElectronicInvoicing
{
    public class MatiasInvoiceDto
    {
        public string InvoiceNumber { get; set; }
        public string IssueDate { get; set; } // YYYY-MM-DD
        public string IssueTime { get; set; } // HH:mm:ss
        public string PaymentMethod { get; set; } // e.g., "10" for Cash, "48" for Credit Card
        
        public MatiasCustomerDto Customer { get; set; }
        public List<MatiasInvoiceLineDto> Lines { get; set; } = new List<MatiasInvoiceLineDto>();
        public MatiasTotalsDto Totals { get; set; }
    }

    public class MatiasCustomerDto
    {
        public string IdentificationType { get; set; } // "13" for CC, "31" for NIT
        public string Identification { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string CityCode { get; set; } // DANE
        public string DepartmentCode { get; set; } // DANE
    }

    public class MatiasInvoiceLineDto
    {
        public int LineNumber { get; set; }
        public string Code { get; set; }
        public string Description { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxRate { get; set; } // IVA %
        public decimal TaxAmount { get; set; }
        public string TaxType { get; set; } // "01" IVA, "04" Impoconsumo
        public decimal TotalAmount { get; set; }
    }

    public class MatiasTotalsDto
    {
        public decimal LineExtensionAmount { get; set; } // Subtotal before taxes
        public decimal TaxExclusiveAmount { get; set; } // Base imponible
        public decimal TaxInclusiveAmount { get; set; } // Total con impuestos
        public decimal PayableAmount { get; set; } // Total a pagar
    }

    public class MatiasResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string Cufe { get; set; }
        public string QrCode { get; set; }
        public string ElectronicInvoiceId { get; set; }
    }
}
