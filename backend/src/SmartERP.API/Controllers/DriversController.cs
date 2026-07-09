using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Transport;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Domain.Enums;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/drivers")]
[Authorize(Policy = "Module:Transport")]
public class DriversController(IDriverService driverService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<DriverDto>>> GetAll([FromQuery] DriverStatus? status, CancellationToken ct) =>
        Ok(await driverService.GetAllAsync(status, ct));

    [HttpGet("expiring-licenses")]
    public async Task<ActionResult<List<DriverDto>>> GetExpiringLicenses(
        [FromQuery] int withinDays = 30, CancellationToken ct = default) =>
        Ok(await driverService.GetExpiringLicensesAsync(withinDays, ct));

    [HttpPost]
    public async Task<ActionResult<DriverDto>> Create(SaveDriverRequest request, CancellationToken ct) =>
        Ok(await driverService.CreateAsync(request, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<DriverDto>> Update(int id, SaveDriverRequest request, CancellationToken ct) =>
        Ok(await driverService.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await driverService.DeleteAsync(id, ct);
        return NoContent();
    }
}
