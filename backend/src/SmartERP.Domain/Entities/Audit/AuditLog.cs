namespace SmartERP.Domain.Entities.Audit;

/// <summary>
/// Sistemdəki bütün dəyişikliklərin qeydiyyatı.
/// Qəsdən BaseEntity-dən irs almır — soft-delete filtri və
/// audit interceptor-u onu izləməsin deyə.
/// </summary>
public class AuditLog
{
    public int Id { get; set; }
    public string UserName { get; set; } = null!;

    /// <summary>Created / Updated / Deleted</summary>
    public string Action { get; set; } = null!;

    public string EntityType { get; set; } = null!;
    public int EntityId { get; set; }

    /// <summary>Dəyişikliklərin JSON təsviri: [{field, old, new}]</summary>
    public string? Changes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
