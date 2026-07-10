using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Hr;
using SmartERP.Application.Features.Hr.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/hr")]
[Authorize(Policy = "Module:Hr")]
public class HrController(IHrSummaryService hrSummaryService) : ControllerBase
{
    // HR modulunun icmal göstəriciləri
    [HttpGet("summary")]
    public async Task<ActionResult<HrSummaryDto>> GetSummary(CancellationToken ct) =>
        Ok(await hrSummaryService.GetSummaryAsync(ct));
}
