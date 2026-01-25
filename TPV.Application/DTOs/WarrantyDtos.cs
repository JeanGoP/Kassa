using System;

namespace TPV.Application.DTOs
{
    public class WarrantyDto
    {
        public int Id { get; set; }
        public string Plate { get; set; }
        public int? CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string Type { get; set; }
        public string Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal StartMileage { get; set; }
        public decimal? LimitMileage1 { get; set; }
        public decimal? LimitMileage2 { get; set; }
        public decimal? LimitMileage3 { get; set; }
        public string TermsAndConditions { get; set; }
        public string Status { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateWarrantyDto
    {
        public string Plate { get; set; }
        public int? CustomerId { get; set; }
        public string Type { get; set; }
        public string Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal StartMileage { get; set; }
        public decimal? LimitMileage1 { get; set; }
        public decimal? LimitMileage2 { get; set; }
        public decimal? LimitMileage3 { get; set; }
        public string TermsAndConditions { get; set; }
        public string Status { get; set; } = "Active";
    }
}