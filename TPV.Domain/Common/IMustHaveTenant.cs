namespace TPV.Domain.Common
{
    public interface IMustHaveTenant
    {
        int TenantId { get; set; }
    }
}