using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Auth;

public class Role : BaseEntity
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = [];
}
