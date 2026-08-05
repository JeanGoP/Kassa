using System.Collections.Generic;

namespace TPV.Application.DTOs
{
    public class SaleCreateDto
    {
        public int BranchId { get; set; }
        public int? CustomerId { get; set; }
        public string PaymentMethod { get; set; }
        public List<SaleItemCreateDto> Items { get; set; } = new();
    }

    public class SaleItemCreateDto
    {
        public int ProductId { get; set; }
        public decimal Quantity { get; set; }
        public int? UnitOfMeasureId { get; set; }
    }
}
