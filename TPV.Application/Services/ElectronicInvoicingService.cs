using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using TPV.Application.DTOs.ElectronicInvoicing;
using TPV.Application.Interfaces;
using TPV.Application.Settings;
using TPV.Domain.Entities;

namespace TPV.Application.Services
{
    public class ElectronicInvoicingService : IElectronicInvoicingService
    {
        private readonly HttpClient _httpClient;
        private readonly MatiasSettings _settings;

        public ElectronicInvoicingService(HttpClient httpClient, IOptions<MatiasSettings> settings)
        {
            _httpClient = httpClient;
            _settings = settings.Value;
            
            if (!string.IsNullOrEmpty(_settings.BaseUrl))
            {
                _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
            }
        }

        public async Task<MatiasResponseDto> GenerateInvoiceAsync(Sale sale)
        {
            try
            {
                // 1. Map Sale to MatiasInvoiceDto
                var invoiceDto = MapToMatiasInvoice(sale);

                if (_settings.EnableMock)
                {
                    await Task.Delay(500); // Simulate network latency
                    var cufe = GenerateMockCufe(sale.InvoiceNumber);
                    var qrCode = $"https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey={cufe}";
                    
                    return new MatiasResponseDto
                    {
                        Success = true,
                        Message = "Factura generada exitosamente en Matias (Mock)",
                        Cufe = cufe,
                        QrCode = qrCode,
                        ElectronicInvoiceId = Guid.NewGuid().ToString()
                    };
                }
                else
                {
                    // Real API Call
                    // Configure Auth Headers
                    _httpClient.DefaultRequestHeaders.Authorization = 
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _settings.ApiKey);

                    // Example endpoint
                    var response = await _httpClient.PostAsJsonAsync("/api/v1/invoices", invoiceDto);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var result = await response.Content.ReadFromJsonAsync<MatiasResponseDto>();
                        return result;
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        throw new Exception($"API Error: {response.StatusCode} - {errorContent}");
                    }
                }
            }
            catch (Exception ex)
            {
                return new MatiasResponseDto
                {
                    Success = false,
                    Message = $"Error generando factura electrónica: {ex.Message}"
                };
            }
        }

        private MatiasInvoiceDto MapToMatiasInvoice(Sale sale)
        {
            var dto = new MatiasInvoiceDto
            {
                InvoiceNumber = sale.InvoiceNumber,
                IssueDate = sale.Date.ToString("yyyy-MM-dd"),
                IssueTime = sale.Date.ToString("HH:mm:ss"),
                PaymentMethod = MapPaymentMethod(sale.PaymentMethod),
                Customer = MapCustomer(sale.Customer),
                Lines = new List<MatiasInvoiceLineDto>(),
                Totals = new MatiasTotalsDto()
            };

            decimal totalTax = 0;
            decimal totalBase = 0;

            int lineNum = 1;
            foreach (var detail in sale.SaleDetails)
            {
                var line = new MatiasInvoiceLineDto
                {
                    LineNumber = lineNum++,
                    Code = detail.Product?.SKU ?? "ITEM",
                    Description = detail.Product?.Name ?? "Item de venta",
                    Quantity = detail.Quantity,
                    UnitPrice = detail.UnitPrice, // Assuming UnitPrice in SaleDetail is inclusive or exclusive? Usually exclusive in DBs but depends.
                                                  // Let's assume UnitPrice is the price sold. We might need to back-calculate tax if it's inclusive.
                                                  // For this exercise, I'll assume the Price in SaleDetail is the base price or handle it simply.
                                                  // Actually, SaleDetail.SubTotal usually implies Qty * Price.
                    DiscountAmount = detail.DiscountAmount,
                    SubTotal = detail.SubTotal
                };

                // Tax Calculation logic
                // If Product has tax info, use it.
                if (detail.Product != null)
                {
                    decimal rate = detail.Product.IvaRate; // e.g., 19.00
                    line.TaxRate = rate;
                    line.TaxType = "01"; // IVA default

                    if (detail.Product.IvaType == "Exento" || detail.Product.IvaType == "Excluido" || rate <= 0)
                    {
                        line.TaxAmount = 0;
                        line.TotalAmount = line.SubTotal;
                    }
                    else
                    {
                        if (detail.Product.PriceIncludesIva)
                        {
                            var divisor = 1 + (rate / 100m);
                            var baseAmount = decimal.Round(line.SubTotal / divisor, 2);
                            var taxAmount = line.SubTotal - baseAmount;
                            line.SubTotal = baseAmount;
                            line.TaxAmount = taxAmount;
                            line.TotalAmount = baseAmount + taxAmount;
                        }
                        else
                        {
                            line.TaxAmount = line.SubTotal * (rate / 100m);
                            line.TotalAmount = line.SubTotal + line.TaxAmount;
                        }
                    }
                }
                else
                {
                    line.TotalAmount = line.SubTotal;
                }

                dto.Lines.Add(line);

                totalBase += line.SubTotal;
                totalTax += line.TaxAmount;
            }

            dto.Totals.LineExtensionAmount = totalBase;
            dto.Totals.TaxExclusiveAmount = totalBase;
            dto.Totals.TaxInclusiveAmount = totalBase + totalTax;
            dto.Totals.PayableAmount = dto.Totals.TaxInclusiveAmount;

            return dto;
        }

        private MatiasCustomerDto MapCustomer(Customer customer)
        {
            if (customer == null)
            {
                // Consumidor Final
                return new MatiasCustomerDto
                {
                    Name = "Consumidor Final",
                    Identification = "222222222222",
                    IdentificationType = "13", // Cédula
                    Address = "Desconocida",
                    CityCode = "00000",
                    DepartmentCode = "00"
                };
            }

            return new MatiasCustomerDto
            {
                Name = $"{customer.FirstName} {customer.LastName}".Trim(),
                Identification = customer.TaxId ?? "222222222222",
                IdentificationType = MapIdentificationType(customer.IdentificationType),
                Email = customer.Email ?? "",
                Phone = customer.Phone ?? "",
                Address = customer.Address ?? "",
                CityCode = customer.City ?? "00000", // Assuming City stores the code now
                DepartmentCode = customer.Department ?? "00"
            };
        }

        private string MapPaymentMethod(string method)
        {
            // DIAN Codes: 10 = Cash, 48 = Credit Card, 47 = Debit Card
            if (string.IsNullOrEmpty(method)) return "10";
            
            var m = method.ToLower();
            if (m.Contains("tarjeta") || m.Contains("credit") || m.Contains("débito")) return "48";
            return "10";
        }

        private string MapIdentificationType(string type)
        {
            if (string.IsNullOrEmpty(type)) return "13"; // CC default
            
            if (type.Contains("NIT")) return "31";
            if (type.Contains("Cédula de Ciudadanía") || type.Contains("CC")) return "13";
            if (type.Contains("Tarjeta de Identidad") || type.Contains("TI")) return "12";
            if (type.Contains("Cédula de Extranjería") || type.Contains("CE")) return "22";
            if (type.Contains("Pasaporte")) return "41";
            
            return "13";
        }

        private string GenerateMockCufe(string invoiceNum)
        {
            // Simulate a SHA-384 hash-like string
            return $"{Guid.NewGuid().ToString("N")}{Guid.NewGuid().ToString("N")}";
        }
    }
}
