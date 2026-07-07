using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Inventory;

public class Warehouse : BaseEntity
{
    public string Name { get; set; } = null!;
    public string? Location { get; set; }

    public ICollection<StockMovement> StockMovements { get; set; } = [];
}
