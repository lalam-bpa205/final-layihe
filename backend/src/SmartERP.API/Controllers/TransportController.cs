using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Transport;
using SmartERP.Application.Features.Transport.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/transport")]
[Authorize(Policy = "Module:Transport")]
public class TransportController(ITransportSummaryService transportSummaryService) : ControllerBase
{
    // Nəqliyyat modulunun icmal göstəriciləri
    [HttpGet("summary")]
    public async Task<ActionResult<TransportSummaryDto>> GetSummary(CancellationToken ct) =>
        Ok(await transportSummaryService.GetSummaryAsync(ct));
}
