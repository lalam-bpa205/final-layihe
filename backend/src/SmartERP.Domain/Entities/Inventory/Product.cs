using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Inventory;

public class Product : BaseEntity
{
    public string Name { get; set; } = null!;
    public string Barcode { get; set; } = null!;
    public string? Description { get; set; }

    /// <summary>Ölçü vahidi: ədəd, kq, litr və s.</summary>
    public string Unit { get; set; } = "ədəd";

    public decimal PurchasePrice { get; set; }
    public decimal SalePrice { get; set; }

    /// <summary>Bu səviyyədən aşağı düşəndə "az stok" xəbərdarlığı verilir.</summary>
    public decimal MinStockLevel { get; set; }

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public ICollection<StockMovement> StockMovements { get; set; } = [];
}
