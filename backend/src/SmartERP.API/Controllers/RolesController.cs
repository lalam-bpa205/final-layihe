using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Auth;
using SmartERP.Application.Features.Auth.Dtos;
using SmartERP.Domain.Constants;
using SmartERP.Domain.Entities.Auth;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize(Roles = $"{RoleNames.SuperAdmin},{RoleNames.Admin}")]
public class RolesController(IAuthService authService, IRepository<Role> roleRepository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var roles = await roleRepository.ListAsync(ct: ct);
        return Ok(roles.Select(r => new { r.Id, r.Name, r.Description }));
    }

    [HttpPost("assign")]
    public async Task<IActionResult> Assign(AssignRoleRequest request, CancellationToken ct)
    {
        await authService.AssignRoleAsync(request, ct);
        return NoContent();
    }

    [HttpPost("remove")]
    public async Task<IActionResult> Remove(AssignRoleRequest request, CancellationToken ct)
    {
        await authService.RemoveRoleAsync(request, ct);
        return NoContent();
    }
}
