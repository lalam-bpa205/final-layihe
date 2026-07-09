using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Transport;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Domain.Enums;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/vehicles")]
[Authorize(Policy = "Module:Transport")]
public class VehiclesController(IVehicleService vehicleService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<VehicleDto>>> GetAll([FromQuery] VehicleStatus? status, CancellationToken ct) =>
        Ok(await vehicleService.GetAllAsync(status, ct));

    [HttpPost]
    public async Task<ActionResult<VehicleDto>> Create(SaveVehicleRequest request, CancellationToken ct) =>
        Ok(await vehicleService.CreateAsync(request, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<VehicleDto>> Update(int id, SaveVehicleRequest request, CancellationToken ct) =>
        Ok(await vehicleService.UpdateAsync(id, request, ct));

    [HttpPost("{id:int}/status")]
    public async Task<ActionResult<VehicleDto>> SetStatus(int id, [FromBody] VehicleStatus status, CancellationToken ct) =>
        Ok(await vehicleService.SetStatusAsync(id, status, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await vehicleService.DeleteAsync(id, ct);
        return NoContent();
    }
}
