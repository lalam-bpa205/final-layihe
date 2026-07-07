using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Hr;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Constants;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/positions")]
[Authorize(Policy = "Module:Hr")]
public class PositionsController(IPositionService positionService) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<List<PositionDto>>> GetAll([FromQuery] int? departmentId, CancellationToken ct) =>
        Ok(await positionService.GetAllAsync(departmentId, ct));

    [HttpPost]
    public async Task<ActionResult<PositionDto>> Create(SavePositionRequest request, CancellationToken ct) =>
        Ok(await positionService.CreateAsync(request, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PositionDto>> Update(int id, SavePositionRequest request, CancellationToken ct) =>
        Ok(await positionService.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await positionService.DeleteAsync(id, ct);
        return NoContent();
    }
}
