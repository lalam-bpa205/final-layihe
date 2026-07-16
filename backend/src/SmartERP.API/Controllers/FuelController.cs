using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Application.Features.Transport.Fuel;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/fuel")]
[Authorize(Policy = "Module:Transport")]
public class FuelController(IFuelService fuelService) : ControllerBase
{
    /// <summary>Yanacaq mənbələri (anbarlar + xarici məntəqələr) və qalıqları.</summary>
    [HttpGet("sources")]
    public async Task<ActionResult<List<FuelSourceDto>>> GetSources(CancellationToken ct) =>
        Ok(await fuelService.GetSourcesAsync(ct));

    [HttpPost("sources")]
    public async Task<ActionResult<FuelSourceDto>> CreateSource(SaveFuelSourceRequest request, CancellationToken ct) =>
        Ok(await fuelService.CreateSourceAsync(request, ct));

    [HttpPut("sources/{id:int}")]
    public async Task<ActionResult<FuelSourceDto>> UpdateSource(int id, SaveFuelSourceRequest request, CancellationToken ct) =>
        Ok(await fuelService.UpdateSourceAsync(id, request, ct));

    /// <summary>Anbara yanacaq mədaxili.</summary>
    [HttpPost("sources/{id:int}/replenish")]
    public async Task<ActionResult<FuelSourceDto>> Replenish(int id, ReplenishFuelSourceRequest request, CancellationToken ct) =>
        Ok(await fuelService.ReplenishAsync(id, request, ct));

    /// <summary>Mənbədən avtomobilə yanacaq köçürməsi (tranzaksiya daxilində).</summary>
    [HttpPost("transfers")]
    public async Task<ActionResult<FuelRecordDto>> Transfer(FuelTransferRequest request, CancellationToken ct) =>
        Ok(await fuelService.TransferAsync(request, ct));

    /// <summary>GPS məsafəsinə əsasən km başına yanacaq sərfiyyatı.</summary>
    [HttpGet("consumption")]
    public async Task<ActionResult<FuelSummaryDto>> GetConsumption(CancellationToken ct) =>
        Ok(await fuelService.GetConsumptionAsync(ct));
}
