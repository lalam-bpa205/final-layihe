using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Inventory;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Constants;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/products")]
[Authorize(Policy = "Module:Inventory")]
public class ProductsController(IProductService productService) : ControllerBase
{
    [HttpGet]
    [Authorize] // məhsul siyahısı digər modulların dropdown-larında da lazımdır (satış/alış sifarişləri)
    public async Task<ActionResult<PagedResult<ProductDto>>> GetPaged([FromQuery] ProductFilter filter, CancellationToken ct) =>
        Ok(await productService.GetPagedAsync(filter, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductDto>> GetById(int id, CancellationToken ct) =>
        Ok(await productService.GetByIdAsync(id, ct));

    [HttpGet("by-barcode/{barcode}")]
    public async Task<ActionResult<ProductDto>> GetByBarcode(string barcode, CancellationToken ct) =>
        Ok(await productService.GetByBarcodeAsync(barcode, ct));

    [HttpGet("low-stock")]
    public async Task<ActionResult<List<ProductDto>>> GetLowStock(CancellationToken ct) =>
        Ok(await productService.GetLowStockAsync(ct));

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(SaveProductRequest request, CancellationToken ct)
    {
        var dto = await productService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProductDto>> Update(int id, SaveProductRequest request, CancellationToken ct) =>
        Ok(await productService.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await productService.DeleteAsync(id, ct);
        return NoContent();
    }
}
