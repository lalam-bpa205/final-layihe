using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Transport;
using SmartERP.Application.Features.Transport.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/deliveries")]
[Authorize(Policy = "Module:Transport")]
public class DeliveriesController(IDeliveryService deliveryService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<DeliveryDto>>> GetPaged([FromQuery] DeliveryFilter filter, CancellationToken ct) =>
        Ok(await deliveryService.GetPagedAsync(filter, ct));

    [HttpPost]
    public async Task<ActionResult<DeliveryDto>> Create(SaveDeliveryRequest request, CancellationToken ct) =>
        Ok(await deliveryService.CreateAsync(request, ct));

    [HttpPost("{id:int}/start")]
    public async Task<ActionResult<DeliveryDto>> Start(int id, CancellationToken ct) =>
        Ok(await deliveryService.StartAsync(id, ct));

    [HttpPost("{id:int}/complete")]
    public async Task<ActionResult<DeliveryDto>> Complete(int id, CancellationToken ct) =>
        Ok(await deliveryService.CompleteAsync(id, ct));

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<DeliveryDto>> Cancel(int id, CancellationToken ct) =>
        Ok(await deliveryService.CancelAsync(id, ct));
}
