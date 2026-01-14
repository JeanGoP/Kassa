using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IReportsService
    {
        Task<IEnumerable<SalesByBranchDto>> GetSalesByBranchAsync(DateTime? start, DateTime? end);
        Task<IEnumerable<ProductMarginDto>> GetProductMarginsAsync(DateTime? start, DateTime? end);
    }
}

