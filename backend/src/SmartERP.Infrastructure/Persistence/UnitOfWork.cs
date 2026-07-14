using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Common;
using SmartERP.Infrastructure.Persistence.Repositories;

namespace SmartERP.Infrastructure.Persistence;

public class UnitOfWork(AppDbContext context) : IUnitOfWork
{
    private readonly Dictionary<Type, object> _repositories = [];

    public IRepository<T> Repository<T>() where T : BaseEntity
    {
        if (_repositories.TryGetValue(typeof(T), out var existing))
            return (IRepository<T>)existing;

        var repository = new Repository<T>(context);
        _repositories[typeof(T)] = repository;
        return repository;
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        context.SaveChangesAsync(ct);

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default)
    {
        // Artıq açıq tranzaksiya varsa (iç-içə çağırış) yenisini açmırıq —
        // əməliyyat mövcud tranzaksiyaya qoşulur, commit/rollback ən xarici blokun məsuliyyətidir.
        if (context.Database.CurrentTransaction is not null)
        {
            await action(ct);
            await context.SaveChangesAsync(ct);
            return;
        }

        await using var transaction = await context.Database.BeginTransactionAsync(ct);
        try
        {
            await action(ct);
            await context.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            RollbackTrackedChanges();
            throw;
        }
    }

    public async Task<TResult> ExecuteInTransactionAsync<TResult>(Func<CancellationToken, Task<TResult>> action, CancellationToken ct = default)
    {
        if (context.Database.CurrentTransaction is not null)
        {
            var innerResult = await action(ct);
            await context.SaveChangesAsync(ct);
            return innerResult;
        }

        await using var transaction = await context.Database.BeginTransactionAsync(ct);
        try
        {
            var result = await action(ct);
            await context.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            RollbackTrackedChanges();
            throw;
        }
    }

    /// <summary>
    /// DB rollback edildikdən sonra ChangeTracker-da qalan "kirli" vəziyyəti təmizləyir.
    /// Əks halda eyni sorğu daxilində növbəti SaveChanges rollback olunmuş
    /// dəyişiklikləri təkrar yazmağa cəhd edərdi.
    /// </summary>
    private void RollbackTrackedChanges() => context.ChangeTracker.Clear();
}
