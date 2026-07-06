using SmartERP.Domain.Common;

namespace SmartERP.Application.Common.Interfaces;

public interface IUnitOfWork
{
    IRepository<T> Repository<T>() where T : BaseEntity;

    Task<int> SaveChangesAsync(CancellationToken ct = default);

    /// <summary>
    /// Verilən əməliyyatı DB tranzaksiyası daxilində icra edir.
    /// Hər hansı addım exception atarsa bütün dəyişikliklər ROLLBACK olunur.
    /// </summary>
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default);

    Task<TResult> ExecuteInTransactionAsync<TResult>(Func<CancellationToken, Task<TResult>> action, CancellationToken ct = default);
}
