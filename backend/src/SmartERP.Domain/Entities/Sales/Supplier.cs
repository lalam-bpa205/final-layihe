using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Sales;

public class Supplier : BaseEntity
{
    public string Name { get; set; } = null!;
    public string? ContactName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }

    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = [];
}
