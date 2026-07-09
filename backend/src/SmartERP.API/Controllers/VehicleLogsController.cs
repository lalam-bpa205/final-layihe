using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Transport;
using SmartERP.Application.Features.Transport.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api")]
[Authorize(Policy = "Module:Transport")]
public class VehicleLogsController(IVehicleLogService logService) : ControllerBase
{
    [HttpGet("fuel-records")]
    public async Task<ActionResult<List<FuelRecordDto>>> GetFuelRecords(
        [FromQuery] int? vehicleId, CancellationToken ct) =>
        Ok(await logService.GetFuelRecordsAsync(vehicleId, ct));

    [HttpPost("fuel-records")]
    public async Task<ActionResult<FuelRecordDto>> AddFuelRecord(SaveFuelRecordRequest request, CancellationToken ct) =>
        Ok(await logService.AddFuelRecordAsync(request, ct));

    [HttpGet("maintenance-records")]
    public async Task<ActionResult<List<MaintenanceRecordDto>>> GetMaintenanceRecords(
        [FromQuery] int? vehicleId, CancellationToken ct) =>
        Ok(await logService.GetMaintenanceRecordsAsync(vehicleId, ct));

    [HttpPost("maintenance-records")]
    public async Task<ActionResult<MaintenanceRecordDto>> AddMaintenanceRecord(SaveMaintenanceRecordRequest request, CancellationToken ct) =>
        Ok(await logService.AddMaintenanceRecordAsync(request, ct));
}
