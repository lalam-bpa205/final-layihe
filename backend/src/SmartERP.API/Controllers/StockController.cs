using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Inventory;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Constants;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/stock")]
[Authorize(Policy = "Module:Inventory")]
public class StockController(IStockService stockService) : ControllerBase
{
    [HttpGet("movements")]
    public async Task<ActionResult<PagedResult<StockMovementDto>>> GetMovements(
        [FromQuery] StockMovementFilter filter, CancellationToken ct) =>
        Ok(await stockService.GetMovementsAsync(filter, ct));

    [HttpGet("levels")]
    public async Task<ActionResult<List<StockLevelDto>>> GetLevels(
        [FromQuery] int? warehouseId, CancellationToken ct) =>
        Ok(await stockService.GetStockLevelsAsync(warehouseId, ct));

    [HttpPost("in")]
    public async Task<ActionResult<StockMovementDto>> StockIn(StockInRequest request, CancellationToken ct) =>
        Ok(await stockService.StockInAsync(request, ct));

    [HttpPost("out")]
    public async Task<ActionResult<StockMovementDto>> StockOut(StockOutRequest request, CancellationToken ct) =>
        Ok(await stockService.StockOutAsync(request, ct));

    /// <summary>Anbarlar arası köçürmə tarixçəsi (hardan → hara).</summary>
    [HttpGet("transfers")]
    public async Task<ActionResult<PagedResult<StockTransferDto>>> GetTransfers(
        [FromQuery] StockTransferFilter filter, CancellationToken ct) =>
        Ok(await stockService.GetTransfersAsync(filter, ct));

    [HttpPost("transfer")]
    public async Task<ActionResult<List<StockMovementDto>>> Transfer(StockTransferRequest request, CancellationToken ct) =>
        Ok(await stockService.TransferAsync(request, ct));
}
