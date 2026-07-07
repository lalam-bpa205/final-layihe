using SmartERP.Domain.Common;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Auth;

/// <summary>İstifadəçinin hansı modullara girişi olduğunu saxlayır.</summary>
public class UserModuleAccess : BaseEntity
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public AppModule Module { get; set; }
}
