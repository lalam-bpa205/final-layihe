using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Inventory;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Constants;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/warehouses")]
[Authorize(Policy = "Module:Inventory")]
public class WarehousesController(IWarehouseService warehouseService) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<List<WarehouseDto>>> GetAll(CancellationToken ct) =>
        Ok(await warehouseService.GetAllAsync(ct));

    [HttpPost]
    public async Task<ActionResult<WarehouseDto>> Create(SaveWarehouseRequest request, CancellationToken ct) =>
        Ok(await warehouseService.CreateAsync(request, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<WarehouseDto>> Update(int id, SaveWarehouseRequest request, CancellationToken ct) =>
        Ok(await warehouseService.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await warehouseService.DeleteAsync(id, ct);
        return NoContent();
    }
}
