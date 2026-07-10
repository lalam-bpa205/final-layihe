using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartERP.Domain.Constants;
using SmartERP.Infrastructure.Persistence;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = $"{RoleNames.SuperAdmin},{RoleNames.Admin}")]
public class AuditLogsController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? entityType = null,
        [FromQuery] string? action = null,
        [FromQuery] string? user = null,
        CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = context.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(a => a.EntityType == entityType);
        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action == action);
        if (!string.IsNullOrWhiteSpace(user))
            query = query.Where(a => a.UserName.Contains(user));

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(a => a.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return Ok(new
        {
            items,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    /// <summary>Filtr dropdown-u üçün mövcud entity tipləri.</summary>
    [HttpGet("entity-types")]
    public async Task<IActionResult> GetEntityTypes(CancellationToken ct) =>
        Ok(await context.AuditLogs
            .Select(a => a.EntityType)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync(ct));
}
