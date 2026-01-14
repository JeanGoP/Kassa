namespace TPV.Application.DTOs
{
    public class ProductMarginDto
    {
        public int ProductId { get; set; }
        public string SKU { get; set; }
        public string Name { get; set; }
        public int QuantitySold { get; set; }
        public decimal Revenue { get; set; }
        public decimal CostTotal { get; set; }
        public decimal Margin => Revenue - CostTotal;
    }
}

