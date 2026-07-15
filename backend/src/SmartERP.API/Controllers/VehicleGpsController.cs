using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Transport.Gps;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/gps")]
[Authorize(Policy = "Module:Transport")]
public class VehicleGpsController(IVehicleGpsService gpsService) : ControllerBase
{
    /// <summary>Bütün avtomobillərin son GPS mövqeyi — xəritə markerləri üçün.</summary>
    [HttpGet("latest")]
    public async Task<ActionResult<List<VehicleLiveLocationDto>>> GetLatest(CancellationToken ct) =>
        Ok(await gpsService.GetLatestAsync(ct));

    /// <summary>Bir avtomobilin tam GPS izi + məsafə/sürət xülasəsi.</summary>
    [HttpGet("vehicles/{vehicleId:int}/track")]
    public async Task<ActionResult<VehicleTrackDto>> GetTrack(int vehicleId, CancellationToken ct) =>
        Ok(await gpsService.GetTrackAsync(vehicleId, ct));

    /// <summary>Avtomobil üçün yeni GPS izi generate edir (GPS simulyatoru).</summary>
    [HttpPost("vehicles/{vehicleId:int}/simulate")]
    public async Task<ActionResult<VehicleTrackDto>> Simulate(int vehicleId, CancellationToken ct) =>
        Ok(await gpsService.SimulateAsync(vehicleId, ct));
}
