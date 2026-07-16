using AutoMapper;
using FluentValidation;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Enums;
using SmartERP.Infrastructure.Persistence;
using SmartERP.Infrastructure.Persistence.Interceptors;

namespace SmartERP.Tests;

/// <summary>
/// Hər test üçün təcrid olunmuş baza qurur.
///
/// QEYD: EF-in "InMemory" provideri tranzaksiyaları dəstəkləmir — onunla
/// rollback testləri heç nə yoxlamadan "keçərdi". Ona görə real tranzaksiya
/// verən SQLite in-memory işlədilir.
/// </summary>
public sealed class TestHarness : IDisposable
{
    private readonly SqliteConnection _connection;

    public AppDbContext Db { get; }
    public IUnitOfWork UnitOfWork { get; }
    public IMapper Mapper { get; }

    public TestHarness()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .AddInterceptors(new AuditInterceptor(new FakeCurrentUser()))
            .Options;

        Db = new AppDbContext(options);
        Db.Database.EnsureCreated();

        UnitOfWork = new UnitOfWork(Db);
        Mapper = BuildMapper();
    }

    private static IMapper BuildMapper()
    {
        var config = new MapperConfiguration(
            cfg => cfg.AddMaps(typeof(DependencyInjection).Assembly),
            new LoggerFactoryStub());
        return config.CreateMapper();
    }

    /// <summary>Validator-u birbaşa Application assembly-sindən götürür.</summary>
    public static IValidator<T> Validator<T>()
    {
        var type = typeof(DependencyInjection).Assembly
            .GetTypes()
            .First(t => !t.IsAbstract && typeof(IValidator<T>).IsAssignableFrom(t));
        return (IValidator<T>)Activator.CreateInstance(type)!;
    }

    public void Dispose()
    {
        Db.Dispose();
        _connection.Dispose();
    }

    private sealed class FakeCurrentUser : ICurrentUserService
    {
        public int? UserId => 1;
        public string? UserName => "test";
        public bool IsAdmin => true;
    }

    /// <summary>Testlərdə bildiriş göndərilmir — yalnız çağırışlar sayılır.</summary>
    public sealed class FakeNotifications : INotificationService
    {
        public int CallCount { get; private set; }

        public Task NotifyModuleAsync(
            AppModule module, string title, string message,
            string? link = null, CancellationToken ct = default)
        {
            CallCount++;
            return Task.CompletedTask;
        }
    }
}

/// <summary>AutoMapper 16 ILoggerFactory tələb edir — testlərdə log lazım deyil.</summary>
internal sealed class LoggerFactoryStub : Microsoft.Extensions.Logging.ILoggerFactory
{
    public void AddProvider(Microsoft.Extensions.Logging.ILoggerProvider provider) { }
    public Microsoft.Extensions.Logging.ILogger CreateLogger(string categoryName) => new NullLogger();
    public void Dispose() { }

    private sealed class NullLogger : Microsoft.Extensions.Logging.ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(Microsoft.Extensions.Logging.LogLevel logLevel) => false;
        public void Log<TState>(
            Microsoft.Extensions.Logging.LogLevel logLevel,
            Microsoft.Extensions.Logging.EventId eventId,
            TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) { }
    }
}
