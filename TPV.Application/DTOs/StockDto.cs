namespace TPV.Application.DTOs
{
    public class StockDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public string ProductSKU { get; set; }
        
        public int BranchId { get; set; }
        public string BranchName { get; set; }

        public decimal Quantity { get; set; }
        public decimal MinStockLevel { get; set; }
        public decimal MaxStockLevel { get; set; }
        public decimal Cost { get; set; }
        public int? BaseUnitId { get; set; }
        public string BaseUnitCode { get; set; } = "UND";
        public string BaseUnitName { get; set; } = "UNIDAD";
        
        public bool IsLowStock => Quantity <= MinStockLevel;
    }
}
