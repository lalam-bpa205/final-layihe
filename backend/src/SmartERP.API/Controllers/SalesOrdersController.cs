using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Sales;
using SmartERP.Application.Features.Sales.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/sales-orders")]
[Authorize(Policy = "Module:Sales")]
public class SalesOrdersController(ISalesOrderService salesOrderService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<SalesOrderDto>>> GetPaged([FromQuery] OrderFilter filter, CancellationToken ct) =>
        Ok(await salesOrderService.GetPagedAsync(filter, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SalesOrderDto>> GetById(int id, CancellationToken ct) =>
        Ok(await salesOrderService.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<SalesOrderDto>> Create(SaveOrderRequest request, CancellationToken ct)
    {
        var dto = await salesOrderService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }

    [HttpPost("{id:int}/confirm")]
    public async Task<ActionResult<SalesOrderDto>> Confirm(int id, CancellationToken ct) =>
        Ok(await salesOrderService.ConfirmAsync(id, ct));

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<SalesOrderDto>> Cancel(int id, CancellationToken ct) =>
        Ok(await salesOrderService.CancelAsync(id, ct));
}
