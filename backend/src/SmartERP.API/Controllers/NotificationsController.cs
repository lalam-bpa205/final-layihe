using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Constants;
using SmartERP.Domain.Entities.Notifications;
using SmartERP.Domain.Enums;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(IRepository<Notification> repository) : ControllerBase
{
    /// <summary>İstifadəçinin modullarına aid son 20 bildiriş.</summary>
    [HttpGet]
    public async Task<IActionResult> GetRecent(CancellationToken ct)
    {
        var isAdmin = User.IsInRole(RoleNames.SuperAdmin) || User.IsInRole(RoleNames.Admin);

        var modules = isAdmin
            ? Enum.GetValues<AppModule>().ToList()
            : User.FindAll("module")
                .Select(c => Enum.TryParse<AppModule>(c.Value, out var m) ? m : (AppModule?)null)
                .Where(m => m is not null)
                .Select(m => m!.Value)
                .ToList();

        var notifications = await repository.Query()
            .Where(n => modules.Contains(n.TargetModule))
            .OrderByDescending(n => n.Id)
            .Take(20)
            .Select(n => new
            {
                n.Id,
                TargetModule = n.TargetModule.ToString(),
                n.Title,
                n.Message,
                n.Link,
                n.CreatedDate
            })
            .ToListAsync(ct);

        return Ok(notifications);
    }
}
