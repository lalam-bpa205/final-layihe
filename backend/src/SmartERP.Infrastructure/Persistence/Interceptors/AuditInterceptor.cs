using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Common;
using SmartERP.Domain.Entities.Audit;

namespace SmartERP.Infrastructure.Persistence.Interceptors;

/// <summary>
/// 1) Audit sahələrini (CreatedBy/UpdatedBy...) avtomatik doldurur,
/// 2) fiziki DELETE-i soft delete-ə çevirir,
/// 3) hər dəyişikliyi AuditLog cədvəlinə yazır (köhnə → yeni dəyərlərlə).
/// </summary>
public class AuditInterceptor(ICurrentUserService currentUser) : SaveChangesInterceptor
{
    // Bu sahələr dəyişiklik siyahısında göstərilmir (səs-küy yaratmasın)
    private static readonly HashSet<string> IgnoredFields =
        [nameof(BaseEntity.CreatedDate), nameof(BaseEntity.CreatedBy),
         nameof(BaseEntity.UpdatedDate), nameof(BaseEntity.UpdatedBy),
         "PasswordHash", "Token", "ReplacedByToken"];

    // Bu entity-lər loglanmır (texniki/səs-küylü)
    private static readonly HashSet<string> IgnoredEntities =
        ["RefreshToken", "Notification", "ChatMessage"];

    private readonly List<(EntityEntry Entry, string Action, string? Changes)> _pending = [];
    private bool _writingAudit;

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, InterceptionResult<int> result)
    {
        Process(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Process(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        WriteAuditLogs(eventData.Context).GetAwaiter().GetResult();
        return base.SavedChanges(eventData, result);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result,
        CancellationToken cancellationToken = default)
    {
        await WriteAuditLogs(eventData.Context, cancellationToken);
        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    private void Process(DbContext? context)
    {
        if (context is null || _writingAudit) return;

        var now = DateTime.UtcNow;
        var user = currentUser.UserName ?? "system";

        foreach (var entry in context.ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted))
                continue;

            var entityName = entry.Entity.GetType().Name;
            var shouldLog = !IgnoredEntities.Contains(entityName);

            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedDate = now;
                    entry.Entity.CreatedBy = user;
                    if (shouldLog)
                        _pending.Add((entry, "Created", SerializeAdded(entry)));
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedDate = now;
                    entry.Entity.UpdatedBy = user;
                    if (shouldLog)
                        _pending.Add((entry, "Updated", SerializeModified(entry)));
                    break;

                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.UpdatedDate = now;
                    entry.Entity.UpdatedBy = user;
                    if (shouldLog)
                        _pending.Add((entry, "Deleted", null));
                    break;
            }
        }
    }

    /// <summary>
    /// Log yazılışı SavedChanges-də edilir — Added entity-lərin Id-si
    /// yalnız INSERT-dən sonra bəlli olur. Eyni tranzaksiya daxilindədir:
    /// əməliyyat rollback olsa loglar da yazılmır.
    /// </summary>
    private async Task WriteAuditLogs(DbContext? context, CancellationToken ct = default)
    {
        if (context is null || _pending.Count == 0 || _writingAudit) return;

        var logs = _pending.Select(p => new AuditLog
        {
            UserName = currentUser.UserName ?? "system",
            Action = p.Action,
            EntityType = p.Entry.Entity.GetType().Name,
            EntityId = p.Entry.Entity is BaseEntity be ? be.Id : 0,
            Changes = p.Changes,
            CreatedAtUtc = DateTime.UtcNow
        }).ToList();

        _pending.Clear();

        _writingAudit = true;
        try
        {
            context.Set<AuditLog>().AddRange(logs);
            await context.SaveChangesAsync(ct);
        }
        finally
        {
            _writingAudit = false;
        }
    }

    private static string SerializeAdded(EntityEntry entry)
    {
        var fields = entry.Properties
            .Where(p => !IgnoredFields.Contains(p.Metadata.Name) &&
                        p.Metadata.Name != "Id" &&
                        p.CurrentValue is not null &&
                        p.CurrentValue as string != "")
            .Select(p => new { field = p.Metadata.Name, @new = Format(p.CurrentValue) })
            .ToList();

        return JsonSerializer.Serialize(fields);
    }

    private static string? SerializeModified(EntityEntry entry)
    {
        var changes = entry.Properties
            .Where(p => p.IsModified &&
                        !IgnoredFields.Contains(p.Metadata.Name) &&
                        !Equals(p.OriginalValue, p.CurrentValue))
            .Select(p => new
            {
                field = p.Metadata.Name,
                old = Format(p.OriginalValue),
                @new = Format(p.CurrentValue)
            })
            .ToList();

        return changes.Count == 0 ? null : JsonSerializer.Serialize(changes);
    }

    private static string? Format(object? value) => value switch
    {
        null => null,
        DateTime dt => dt.ToString("yyyy-MM-dd HH:mm"),
        DateOnly d => d.ToString("yyyy-MM-dd"),
        TimeOnly t => t.ToString("HH:mm"),
        decimal m => m.ToString("0.##"),
        _ => value.ToString()
    };
}
