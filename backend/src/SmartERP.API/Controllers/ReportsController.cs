using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartERP.Application.Features.Reports;

namespace SmartERP.API.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Policy = "Module:Reports")]
public class ReportsController(IReportService reportService) : ControllerBase
{
    private const string XlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private FileContentResult Xlsx(ExcelFile file) =>
        File(file.Content, XlsxMime, file.FileName);

    // ---------- Export ----------
    [HttpGet("employees/excel")]
    public async Task<IActionResult> ExportEmployees(CancellationToken ct) =>
        Xlsx(await reportService.ExportEmployeesAsync(ct));

    [HttpGet("products/excel")]
    public async Task<IActionResult> ExportProducts(CancellationToken ct) =>
        Xlsx(await reportService.ExportProductsAsync(ct));

    [HttpGet("stock/excel")]
    public async Task<IActionResult> ExportStock(CancellationToken ct) =>
        Xlsx(await reportService.ExportStockLevelsAsync(ct));

    [HttpGet("finance/excel")]
    public async Task<IActionResult> ExportFinance(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct) =>
        Xlsx(await reportService.ExportFinanceAsync(from, to, ct));

    [HttpGet("sales-orders/excel")]
    public async Task<IActionResult> ExportSalesOrders(CancellationToken ct) =>
        Xlsx(await reportService.ExportSalesOrdersAsync(ct));

    [HttpGet("deliveries/excel")]
    public async Task<IActionResult> ExportDeliveries(CancellationToken ct) =>
        Xlsx(await reportService.ExportDeliveriesAsync(ct));

    // ---------- Import şablonları ----------
    [HttpGet("products/import-template")]
    public IActionResult ProductTemplate() => Xlsx(reportService.GetProductImportTemplate());

    [HttpGet("customers/import-template")]
    public IActionResult CustomerTemplate() => Xlsx(reportService.GetPartnerImportTemplate("customers"));

    [HttpGet("suppliers/import-template")]
    public IActionResult SupplierTemplate() => Xlsx(reportService.GetPartnerImportTemplate("suppliers"));

    // ---------- Import ----------
    [HttpPost("products/import")]
    public async Task<ActionResult<ImportResult>> ImportProducts(IFormFile file, CancellationToken ct)
    {
        var result = await reportService.ImportProductsAsync(file.OpenReadStream(), ct);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("customers/import")]
    public async Task<ActionResult<ImportResult>> ImportCustomers(IFormFile file, CancellationToken ct)
    {
        var result = await reportService.ImportCustomersAsync(file.OpenReadStream(), ct);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("suppliers/import")]
    public async Task<ActionResult<ImportResult>> ImportSuppliers(IFormFile file, CancellationToken ct)
    {
        var result = await reportService.ImportSuppliersAsync(file.OpenReadStream(), ct);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
