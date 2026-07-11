using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Inventory;
using SmartERP.Application.Features.Inventory.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize(Policy = "Module:Inventory")]
public class InventoryController(IInventorySummaryService inventorySummaryService) : ControllerBase
{
    // Anbar modulunun icmal göstəriciləri
    [HttpGet("summary")]
    public async Task<ActionResult<InventorySummaryDto>> GetSummary(CancellationToken ct) =>
        Ok(await inventorySummaryService.GetSummaryAsync(ct));
}
