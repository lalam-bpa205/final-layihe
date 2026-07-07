using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Hr;

public class Position : BaseEntity
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }

    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public ICollection<Employee> Employees { get; set; } = [];
}
