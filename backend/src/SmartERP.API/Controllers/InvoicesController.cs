using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Finance;
using SmartERP.Application.Features.Finance.Dtos;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/invoices")]
[Authorize(Policy = "Module:Finance")]
public class InvoicesController(IInvoiceService invoiceService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<InvoiceDto>>> GetPaged([FromQuery] InvoiceFilter filter, CancellationToken ct) =>
        Ok(await invoiceService.GetPagedAsync(filter, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<InvoiceDto>> GetById(int id, CancellationToken ct) =>
        Ok(await invoiceService.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<InvoiceDto>> Create(SaveInvoiceRequest request, CancellationToken ct)
    {
        var dto = await invoiceService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }

    [HttpPost("{id:int}/payments")]
    public async Task<ActionResult<InvoiceDto>> AddPayment(int id, AddPaymentRequest request, CancellationToken ct) =>
        Ok(await invoiceService.AddPaymentAsync(id, request, ct));

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<InvoiceDto>> Cancel(int id, CancellationToken ct) =>
        Ok(await invoiceService.CancelAsync(id, ct));
}
