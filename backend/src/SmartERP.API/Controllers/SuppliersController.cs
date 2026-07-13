using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Sales;
using SmartERP.Application.Features.Sales.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/suppliers")]
[Authorize(Policy = "Module:Sales")]
public class SuppliersController(ISupplierService supplierService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<PartnerDto>>> GetAll([FromQuery] string? search, CancellationToken ct) =>
        Ok(await supplierService.GetAllAsync(search, ct));

    [HttpGet("{id:int}/details")]
    public async Task<ActionResult<SupplierDetailsDto>> GetDetails(int id, CancellationToken ct) =>
        Ok(await supplierService.GetDetailsAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<PartnerDto>> Create(SavePartnerRequest request, CancellationToken ct) =>
        Ok(await supplierService.CreateAsync(request, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PartnerDto>> Update(int id, SavePartnerRequest request, CancellationToken ct) =>
        Ok(await supplierService.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await supplierService.DeleteAsync(id, ct);
        return NoContent();
    }
}
