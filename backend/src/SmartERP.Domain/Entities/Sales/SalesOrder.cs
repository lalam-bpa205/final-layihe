using SmartERP.Domain.Common;
using SmartERP.Domain.Entities.Finance;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Sales;

public class SalesOrder : BaseEntity
{
    /// <summary>Sənəd nömrəsi: SO-00001</summary>
    public string Number { get; set; } = null!;

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public DateOnly OrderDate { get; set; }

    /// <summary>Stokun çıxacağı anbar</summary>
    public int WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;

    public SalesOrderStatus Status { get; set; } = SalesOrderStatus.Pending;
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }

    /// <summary>Təsdiq zamanı avtomatik yaradılan faktura</summary>
    public int? InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    public ICollection<SalesOrderItem> Items { get; set; } = [];
}

public class SalesOrderItem : BaseEntity
{
    public int SalesOrderId { get; set; }
    public SalesOrder SalesOrder { get; set; } = null!;

    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}
