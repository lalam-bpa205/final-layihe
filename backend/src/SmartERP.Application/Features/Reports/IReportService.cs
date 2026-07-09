namespace SmartERP.Application.Features.Reports;

public record ExcelFile(byte[] Content, string FileName);

public class ImportResult
{
    public int AddedCount { get; set; }
    public List<string> Errors { get; set; } = [];
    public bool Success => Errors.Count == 0;
}

public interface IReportService
{
    // ---------- Export ----------
    Task<ExcelFile> ExportEmployeesAsync(CancellationToken ct = default);
    Task<ExcelFile> ExportProductsAsync(CancellationToken ct = default);
    Task<ExcelFile> ExportStockLevelsAsync(CancellationToken ct = default);
    Task<ExcelFile> ExportFinanceAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<ExcelFile> ExportSalesOrdersAsync(CancellationToken ct = default);
    Task<ExcelFile> ExportDeliveriesAsync(CancellationToken ct = default);

    // ---------- Import ----------
    ExcelFile GetProductImportTemplate();
    ExcelFile GetPartnerImportTemplate(string kind);
    Task<ImportResult> ImportProductsAsync(Stream file, CancellationToken ct = default);
    Task<ImportResult> ImportCustomersAsync(Stream file, CancellationToken ct = default);
    Task<ImportResult> ImportSuppliersAsync(Stream file, CancellationToken ct = default);
}
