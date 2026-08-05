using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class ProductReferenceRelation : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int RelatedProductId { get; set; }
        public Product RelatedProduct { get; set; } = null!;
        public string RelationType { get; set; } = "INTERCAMBIABLE";
        public string SourceType { get; set; } = "CATALOGO_OFICIAL";
        public DateTime? EffectiveFrom { get; set; }
    }
}
