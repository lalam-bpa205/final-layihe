using Microsoft.AspNetCore.SignalR;
using SmartERP.API.Hubs;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Entities.Notifications;
using SmartERP.Domain.Enums;

namespace SmartERP.API.Services;

public class SignalRNotificationService(
    IHubContext<NotificationHub> hubContext,
    IUnitOfWork unitOfWork,
    ILogger<SignalRNotificationService> logger) : INotificationService
{
    public async Task NotifyModuleAsync(
        AppModule module, string title, string message,
        string? link = null, CancellationToken ct = default)
    {
        try
        {
            // 1) DB-də saxla (tarixçə üçün)
            var notification = new Notification
            {
                TargetModule = module,
                Title = title,
                Message = message,
                Link = link
            };
            await unitOfWork.Repository<Notification>().AddAsync(notification, ct);
            await unitOfWork.SaveChangesAsync(ct);

            // 2) Real vaxtda modul qrupuna göndər
            await hubContext.Clients.Group($"module-{module}").SendAsync("notification", new
            {
                notification.Id,
                TargetModule = module.ToString(),
                notification.Title,
                notification.Message,
                notification.Link,
                notification.CreatedDate
            }, ct);
        }
        catch (Exception ex)
        {
            // Bildiriş xətası əsas əməliyyatı pozmamalıdır
            logger.LogError(ex, "Bildiriş göndərilə bilmədi: {Title}", title);
        }
    }
}
