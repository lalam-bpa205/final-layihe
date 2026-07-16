using SmartERP.Domain.Common;
using SmartERP.Domain.Entities.Hr;

namespace SmartERP.Domain.Entities.Inventory;

public class Warehouse : BaseEntity
{
    public string Name { get; set; } = null!;
    public string? Location { get; set; }

    /// <summary>Anbara cavabdeh anbardar — mövcud işçiyə (Employee) bağlanır. Təyin olunmaya da bilər.</summary>
    public int? KeeperId { get; set; }
    public Employee? Keeper { get; set; }

    public ICollection<StockMovement> StockMovements { get; set; } = [];
}
