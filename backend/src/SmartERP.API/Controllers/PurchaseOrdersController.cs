using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Sales;
using SmartERP.Application.Features.Sales.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/purchase-orders")]
[Authorize(Policy = "Module:Sales")]
public class PurchaseOrdersController(IPurchaseOrderService purchaseOrderService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<PurchaseOrderDto>>> GetPaged([FromQuery] OrderFilter filter, CancellationToken ct) =>
        Ok(await purchaseOrderService.GetPagedAsync(filter, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PurchaseOrderDto>> GetById(int id, CancellationToken ct) =>
        Ok(await purchaseOrderService.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<PurchaseOrderDto>> Create(SaveOrderRequest request, CancellationToken ct)
    {
        var dto = await purchaseOrderService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }

    [HttpPost("{id:int}/receive")]
    public async Task<ActionResult<PurchaseOrderDto>> Receive(int id, CancellationToken ct) =>
        Ok(await purchaseOrderService.ReceiveAsync(id, ct));

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<PurchaseOrderDto>> Cancel(int id, CancellationToken ct) =>
        Ok(await purchaseOrderService.CancelAsync(id, ct));
}
