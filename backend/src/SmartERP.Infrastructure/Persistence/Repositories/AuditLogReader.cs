using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Entities.Audit;

namespace SmartERP.Infrastructure.Persistence.Repositories;

/// <inheritdoc cref="IAuditLogReader"/>
public class AuditLogReader(AppDbContext context) : IAuditLogReader
{
    public async Task<List<AuditLog>> GetRecentAsync(int take, CancellationToken ct = default) =>
        await context.AuditLogs
            .AsNoTracking()
            .OrderByDescending(a => a.Id)
            .Take(take)
            .ToListAsync(ct);

    public async Task<List<AuditUserActivity>> GetTopUsersAsync(
        DateTime sinceUtc, int take, CancellationToken ct = default) =>
        await context.AuditLogs
            .AsNoTracking()
            .Where(a => a.CreatedAtUtc >= sinceUtc)
            .GroupBy(a => a.UserName)
            .Select(g => new AuditUserActivity { UserName = g.Key, ActionCount = g.Count() })
            .OrderByDescending(x => x.ActionCount)
            .Take(take)
            .ToListAsync(ct);
}
