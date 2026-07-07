using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Hr;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Constants;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/employees")]
[Authorize(Policy = "Module:Hr")]
public class EmployeesController(IEmployeeService employeeService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<EmployeeDto>>> GetPaged([FromQuery] EmployeeFilter filter, CancellationToken ct) =>
        Ok(await employeeService.GetPagedAsync(filter, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EmployeeDto>> GetById(int id, CancellationToken ct) =>
        Ok(await employeeService.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<EmployeeDto>> Create(SaveEmployeeRequest request, CancellationToken ct)
    {
        var dto = await employeeService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<EmployeeDto>> Update(int id, SaveEmployeeRequest request, CancellationToken ct) =>
        Ok(await employeeService.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await employeeService.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpGet("{id:int}/modules")]
    public async Task<ActionResult<List<string>>> GetModules(int id, CancellationToken ct) =>
        Ok(await employeeService.GetModulesAsync(id, ct));

    [HttpPut("{id:int}/modules")]
    public async Task<IActionResult> SetModules(int id, SetEmployeeModulesRequest request, CancellationToken ct)
    {
        await employeeService.SetModulesAsync(id, request, ct);
        return NoContent();
    }
}
