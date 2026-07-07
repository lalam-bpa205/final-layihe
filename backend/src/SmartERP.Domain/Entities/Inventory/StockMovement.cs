using SmartERP.Domain.Common;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Inventory;

/// <summary>
/// Stok balansı ayrıca sütunda saxlanmır — hərəkətlərin cəmindən hesablanır.
/// Bu, balansın heç vaxt "sürüşməməsini" təmin edir (single source of truth).
/// </summary>
public class StockMovement : BaseEntity
{
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public int WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = null!;

    public StockMovementType Type { get; set; }
    public decimal Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? Note { get; set; }

    /// <summary>Transferin iki hərəkətini bir-birinə bağlayan qrup ID-si.</summary>
    public Guid? TransferGroupId { get; set; }
}
