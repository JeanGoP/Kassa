using System;

namespace TPV.Application.DTOs
{
    public class ServiceOrderDto
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string Plate { get; set; }
        public string Brand { get; set; }
        public string Model { get; set; }
        public int Year { get; set; }
        public decimal Mileage { get; set; }
        public DateTime IntakeDateTime { get; set; }
        public string FuelLevel { get; set; }
        public string InitialObservations { get; set; }
        public string VisualCondition { get; set; }
        public string Technician { get; set; }
        public string Status { get; set; }
    }

    public class CreateServiceOrderDto
    {
        public int CustomerId { get; set; }
        public string Plate { get; set; }
        public string Brand { get; set; }
        public string Model { get; set; }
        public int Year { get; set; }
        public decimal Mileage { get; set; }
        public DateTime IntakeDateTime { get; set; }
        public string FuelLevel { get; set; }
        public string InitialObservations { get; set; }
        public string VisualCondition { get; set; }
        public string Technician { get; set; }
        public string Status { get; set; }
    }

    public class ServiceOrderDiagnosisDto
    {
        public string ProblemDescription { get; set; }
        public string TechnicalDiagnosis { get; set; }
        public bool? CustomerApproved { get; set; }
        public DateTime? ApprovalDate { get; set; }
    }

    public class ServiceOrderWorkDto
    {
        public int Id { get; set; }
        public int ServiceOrderId { get; set; }
        public string Description { get; set; }
        public string Technician { get; set; }
        public decimal? EstimatedTimeHours { get; set; }
        public decimal LaborCost { get; set; }
        public string Status { get; set; }
    }

    public class CreateServiceOrderWorkDto
    {
        public string Description { get; set; }
        public string Technician { get; set; }
        public decimal? EstimatedTimeHours { get; set; }
        public decimal LaborCost { get; set; }
        public string Status { get; set; }
    }

    public class ServiceOrderWorkStatusDto
    {
        public string Status { get; set; }
    }
}
