using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Hr;

public class Department : BaseEntity
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }

    public ICollection<Employee> Employees { get; set; } = [];
    public ICollection<Position> Positions { get; set; } = [];
}
