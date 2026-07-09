using SmartERP.Domain.Common;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Sales;

public class PurchaseOrder : BaseEntity
{
    /// <summary>Sənəd nömrəsi: PO-00001</summary>
    public string Number { get; set; } = null!;

    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public DateOnly OrderDate { get; set; }

    /// <summary>Malın qəbul olunacağı anbar</summary>
    public int WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;

    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Pending;
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }

    public ICollection<PurchaseOrderItem> Items { get; set; } = [];
}

public class PurchaseOrderItem : BaseEntity
{
    public int PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;

    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}
