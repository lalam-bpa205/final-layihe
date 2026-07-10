namespace SmartERP.Application.Common.Interfaces;

/// <summary>
/// Hazırkı istifadəçi haqqında məlumat (JWT claim-lərdən oxunur).
/// Audit sahələrinin (CreatedBy/UpdatedBy) doldurulmasında istifadə olunur.
/// </summary>
public interface ICurrentUserService
{
    int? UserId { get; }
    string? UserName { get; }

    /// <summary>SuperAdmin və ya Admin roludadır.</summary>
    bool IsAdmin { get; }
}
