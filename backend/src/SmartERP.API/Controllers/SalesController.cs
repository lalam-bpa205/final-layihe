using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Sales;
using SmartERP.Application.Features.Sales.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/sales")]
[Authorize(Policy = "Module:Sales")]
public class SalesController(ISalesOverviewService overviewService) : ControllerBase
{
    // ---------- İcmal / Analitika ----------
    [HttpGet("overview")]
    public async Task<ActionResult<SalesOverviewDto>> GetOverview(CancellationToken ct) =>
        Ok(await overviewService.GetOverviewAsync(ct));
}
