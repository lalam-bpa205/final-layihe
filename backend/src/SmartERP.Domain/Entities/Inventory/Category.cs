using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Inventory;

public class Category : BaseEntity
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }

    public ICollection<Product> Products { get; set; } = [];
}
