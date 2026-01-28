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

        public int Quantity { get; set; }
        public int MinStockLevel { get; set; }
        public int MaxStockLevel { get; set; }
        public decimal Cost { get; set; }
        
        public bool IsLowStock => Quantity <= MinStockLevel;
    }
}
