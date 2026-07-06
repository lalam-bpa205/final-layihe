using System.Linq.Expressions;
using SmartERP.Domain.Common;

namespace SmartERP.Application.Common.Interfaces;

public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<List<T>> ListAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default);

    /// <summary>Mürəkkəb sorğular (Include, OrderBy, pagination) üçün açıq IQueryable.</summary>
    IQueryable<T> Query();

    Task AddAsync(T entity, CancellationToken ct = default);
    void Update(T entity);

    /// <summary>Soft delete — interceptor DELETE-i UPDATE(IsDeleted=1)-ə çevirir.</summary>
    void Remove(T entity);

    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default);
}
