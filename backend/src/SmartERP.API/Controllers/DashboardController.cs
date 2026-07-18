using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Dashboard;
using SmartERP.Domain.Constants;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = $"{RoleNames.SuperAdmin},{RoleNames.Admin}")]
public class DashboardController(
    IDashboardService dashboardService,
    IDashboardPdfService pdfService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get(CancellationToken ct) =>
        Ok(await dashboardService.GetAsync(ct));

    /// <summary>İdarəetmə panelini çap-hazır PDF hesabat kimi yükləyir.</summary>
    [HttpGet("pdf")]
    public async Task<IActionResult> DownloadPdf(CancellationToken ct)
    {
        var data = await dashboardService.GetAsync(ct);
        var bytes = pdfService.Generate(data, User.Identity?.Name ?? "admin");
        return File(bytes, "application/pdf", $"idareetme-hesabati-{DateTime.Now:yyyy-MM-dd}.pdf");
    }
}
