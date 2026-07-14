using SmartERP.Domain.Entities.Audit;

namespace SmartERP.Application.Common.Interfaces;

/// <summary>
/// AuditLog oxu abstraksiyası.
/// AuditLog qəsdən BaseEntity-dən irs almadığı üçün IUnitOfWork.Repository&lt;T&gt;()
/// ilə əlçatan deyil — bu interfeys Application qatına yalnız oxu imkanı verir.
/// </summary>
public interface IAuditLogReader
{
    /// <summary>Son N audit qeydi (Id azalan sıra ilə).</summary>
    Task<List<AuditLog>> GetRecentAsync(int take, CancellationToken ct = default);

    /// <summary>
    /// Verilən tarixdən (UTC) sonra ən aktiv istifadəçilər —
    /// əməliyyat sayı azalan sıra ilə, ilk N nəfər.
    /// </summary>
    Task<List<AuditUserActivity>> GetTopUsersAsync(DateTime sinceUtc, int take, CancellationToken ct = default);
}

/// <summary>İstifadəçi üzrə audit əməliyyatlarının sayı.</summary>
public class AuditUserActivity
{
    public string UserName { get; set; } = null!;
    public int ActionCount { get; set; }
}
