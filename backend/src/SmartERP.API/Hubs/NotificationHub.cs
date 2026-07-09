using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SmartERP.Domain.Constants;
using SmartERP.Domain.Enums;

namespace SmartERP.API.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    /// <summary>
    /// Qoşulan istifadəçi modul icazələrinə uyğun qruplara əlavə olunur.
    /// Bildirişlər "module-Hr", "module-Inventory"... qruplarına göndərilir.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var user = Context.User;
        if (user is not null)
        {
            var isAdmin = user.IsInRole(RoleNames.SuperAdmin) || user.IsInRole(RoleNames.Admin);

            var modules = isAdmin
                ? Enum.GetNames<AppModule>()
                : user.FindAll("module").Select(c => c.Value).Distinct().ToArray();

            foreach (var module in modules)
                await Groups.AddToGroupAsync(Context.ConnectionId, $"module-{module}");
        }

        await base.OnConnectedAsync();
    }
}
