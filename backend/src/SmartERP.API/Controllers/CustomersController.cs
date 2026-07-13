using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Sales;
using SmartERP.Application.Features.Sales.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize(Policy = "Module:Sales")]
public class CustomersController(ICustomerService customerService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<PartnerDto>>> GetAll([FromQuery] string? search, CancellationToken ct) =>
        Ok(await customerService.GetAllAsync(search, ct));

    [HttpGet("{id:int}/details")]
    public async Task<ActionResult<CustomerDetailsDto>> GetDetails(int id, CancellationToken ct) =>
        Ok(await customerService.GetDetailsAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<PartnerDto>> Create(SavePartnerRequest request, CancellationToken ct) =>
        Ok(await customerService.CreateAsync(request, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PartnerDto>> Update(int id, SavePartnerRequest request, CancellationToken ct) =>
        Ok(await customerService.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await customerService.DeleteAsync(id, ct);
        return NoContent();
    }
}
