using SmartERP.Domain.Enums;

namespace SmartERP.Application.Common.Interfaces;

/// <summary>
/// Bildirişi DB-yə yazır və SignalR ilə modul qrupuna göndərir.
/// Tranzaksiya commit olunduqdan SONRA çağırılmalıdır.
/// </summary>
public interface INotificationService
{
    Task NotifyModuleAsync(
        AppModule module, string title, string message,
        string? link = null, CancellationToken ct = default);
}
