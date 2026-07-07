using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Models;

namespace SmartERP.Application.Common.Extensions;

public static class QueryableExtensions
{
    /// <summary>
    /// Sorğunu səhifələyib PagedResult qaytarır. Count və Items iki ayrı
    /// sorğu ilə alınır — böyük cədvəllərdə bütün datanı çəkməmək üçün.
    /// </summary>
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<T>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }
}
