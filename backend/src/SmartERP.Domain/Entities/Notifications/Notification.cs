using SmartERP.Domain.Common;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Notifications;

/// <summary>
/// Modul-hədəfli bildiriş: həmin modula icazəsi olan bütün
/// istifadəçilərə (və adminlərə) real vaxtda çatdırılır.
/// </summary>
public class Notification : BaseEntity
{
    public AppModule TargetModule { get; set; }
    public string Title { get; set; } = null!;
    public string Message { get; set; } = null!;

    /// <summary>Frontend yolu (məs. /hr/leave-requests)</summary>
    public string? Link { get; set; }
}
