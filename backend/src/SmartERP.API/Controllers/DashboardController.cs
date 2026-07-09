using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Dashboard;
using SmartERP.Domain.Constants;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = $"{RoleNames.SuperAdmin},{RoleNames.Admin}")]
public class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get(CancellationToken ct) =>
        Ok(await dashboardService.GetAsync(ct));
}
