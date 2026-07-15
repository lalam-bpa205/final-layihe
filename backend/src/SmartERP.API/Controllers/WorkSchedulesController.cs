using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Hr;
using SmartERP.Application.Features.Hr.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/work-schedules")]
[Authorize(Policy = "Module:Hr")]
public class WorkSchedulesController(IWorkScheduleService workScheduleService) : ControllerBase
{
    // Siyahıya bütün daxil olmuş istifadəçilər baxa bilər (işçi formasındakı dropdown üçün)
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<List<WorkScheduleDto>>> GetAll(CancellationToken ct) =>
        Ok(await workScheduleService.GetAllAsync(ct));

    [HttpPost]
    public async Task<ActionResult<WorkScheduleDto>> Create(SaveWorkScheduleRequest request, CancellationToken ct) =>
        Ok(await workScheduleService.CreateAsync(request, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<WorkScheduleDto>> Update(int id, SaveWorkScheduleRequest request, CancellationToken ct) =>
        Ok(await workScheduleService.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await workScheduleService.DeleteAsync(id, ct);
        return NoContent();
    }
}
