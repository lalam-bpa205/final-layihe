using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Hr;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Constants;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize(Policy = "Module:Hr")]
public class DepartmentsController(IDepartmentService departmentService) : ControllerBase
{
    [HttpGet]
    [Authorize] // siyahıya bütün daxil olmuş istifadəçilər baxa bilər (dropdown-lar üçün)
    public async Task<ActionResult<List<DepartmentDto>>> GetAll(CancellationToken ct) =>
        Ok(await departmentService.GetAllAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DepartmentDto>> GetById(int id, CancellationToken ct) =>
        Ok(await departmentService.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<DepartmentDto>> Create(SaveDepartmentRequest request, CancellationToken ct)
    {
        var dto = await departmentService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<DepartmentDto>> Update(int id, SaveDepartmentRequest request, CancellationToken ct) =>
        Ok(await departmentService.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await departmentService.DeleteAsync(id, ct);
        return NoContent();
    }
}
