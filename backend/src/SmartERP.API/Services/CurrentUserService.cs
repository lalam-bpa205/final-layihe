using System.Security.Claims;
using SmartERP.Application.Common.Interfaces;

namespace SmartERP.API.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public int? UserId =>
        int.TryParse(
            httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var id) ? id : null;

    public string? UserName =>
        httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Name);

    public bool IsAdmin =>
        httpContextAccessor.HttpContext?.User is { } user &&
        (user.IsInRole("SuperAdmin") || user.IsInRole("Admin"));
}
