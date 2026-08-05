using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class UnitOfMeasure : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string Code { get; set; } = "UND";
        public string Name { get; set; } = "UNIDAD";
        public string Symbol { get; set; } = "UND";
        public bool AllowsDecimals { get; set; }
        public ICollection<ProductUnitConversion> ProductConversions { get; set; } = new List<ProductUnitConversion>();
    }
}
