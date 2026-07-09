using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Reports;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Entities.Sales;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;
using FinanceTx = SmartERP.Domain.Entities.Finance.FinanceTransaction;

namespace SmartERP.Infrastructure.Reports;

public class ExcelReportService(IUnitOfWork unitOfWork) : IReportService
{
    // ==================== EXPORT ====================

    public async Task<ExcelFile> ExportEmployeesAsync(CancellationToken ct = default)
    {
        var employees = await unitOfWork.Repository<Employee>().Query()
            .Include(e => e.Department).Include(e => e.Position)
            .OrderBy(e => e.FirstName)
            .ToListAsync(ct);

        return Build("İşçilər", "employees",
            ["Ad", "Soyad", "Email", "Telefon", "Şöbə", "Vəzifə", "Maaş (₼)", "İşə qəbul"],
            employees.Select(e => new object?[]
            {
                e.FirstName, e.LastName, e.Email, e.Phone,
                e.Department.Name, e.Position.Title, e.Salary, e.HireDate.ToString("yyyy-MM-dd")
            }));
    }

    public async Task<ExcelFile> ExportProductsAsync(CancellationToken ct = default)
    {
        var products = await unitOfWork.Repository<Product>().Query()
            .Include(p => p.Category)
            .Select(p => new
            {
                p.Name, p.Barcode, Category = p.Category.Name, p.Unit,
                p.PurchasePrice, p.SalePrice, p.MinStockLevel,
                CurrentStock = p.StockMovements.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity : -m.Quantity)
            })
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

        return Build("Məhsullar", "products",
            ["Ad", "Barkod", "Kateqoriya", "Vahid", "Alış (₼)", "Satış (₼)", "Min stok", "Cari stok"],
            products.Select(p => new object?[]
            {
                p.Name, p.Barcode, p.Category, p.Unit,
                p.PurchasePrice, p.SalePrice, p.MinStockLevel, p.CurrentStock
            }));
    }

    public async Task<ExcelFile> ExportStockLevelsAsync(CancellationToken ct = default)
    {
        var levels = await unitOfWork.Repository<StockMovement>().Query()
            .GroupBy(m => new { ProductName = m.Product.Name, m.Product.Unit, WarehouseName = m.Warehouse.Name })
            .Select(g => new
            {
                g.Key.ProductName, g.Key.Unit, g.Key.WarehouseName,
                Quantity = g.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity : -m.Quantity)
            })
            .Where(x => x.Quantity != 0)
            .OrderBy(x => x.ProductName)
            .ToListAsync(ct);

        return Build("Anbar qalıqları", "stock",
            ["Məhsul", "Anbar", "Qalıq", "Vahid"],
            levels.Select(l => new object?[] { l.ProductName, l.WarehouseName, l.Quantity, l.Unit }));
    }

    public async Task<ExcelFile> ExportFinanceAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<FinanceTx>().Query();
        if (from is not null) query = query.Where(t => t.Date >= from);
        if (to is not null) query = query.Where(t => t.Date <= to);

        var transactions = await query
            .Include(t => t.Category)
            .OrderBy(t => t.Date)
            .ToListAsync(ct);

        var file = Build("Maliyyə hesabatı", "finance",
            ["Tarix", "Tip", "Kateqoriya", "Məbləğ (₼)", "Üsul", "Təsvir"],
            transactions.Select(t => new object?[]
            {
                t.Date.ToString("yyyy-MM-dd"),
                t.Type == TransactionType.Income ? "Gəlir" : "Xərc",
                t.Category.Name,
                t.Type == TransactionType.Income ? t.Amount : -t.Amount,
                t.Method switch
                {
                    PaymentMethod.Cash => "Nağd",
                    PaymentMethod.Card => "Kart",
                    _ => "Bank köçürməsi"
                },
                t.Description
            }),
            workbook =>
            {
                // Yekun sətirləri
                var ws = workbook.Worksheets.First();
                var lastRow = ws.LastRowUsed()!.RowNumber();
                var income = transactions.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
                var expense = transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);

                ws.Cell(lastRow + 2, 3).Value = "Ümumi gəlir:";
                ws.Cell(lastRow + 2, 4).Value = income;
                ws.Cell(lastRow + 3, 3).Value = "Ümumi xərc:";
                ws.Cell(lastRow + 3, 4).Value = expense;
                ws.Cell(lastRow + 4, 3).Value = "Mənfəət:";
                ws.Cell(lastRow + 4, 4).Value = income - expense;
                ws.Range(lastRow + 2, 3, lastRow + 4, 4).Style.Font.SetBold();
            });

        return file;
    }

    public async Task<ExcelFile> ExportSalesOrdersAsync(CancellationToken ct = default)
    {
        var orders = await unitOfWork.Repository<SalesOrder>().Query()
            .Include(o => o.Customer).Include(o => o.Warehouse).Include(o => o.Invoice)
            .OrderByDescending(o => o.Id)
            .ToListAsync(ct);

        return Build("Satış sifarişləri", "sales_orders",
            ["Nömrə", "Müştəri", "Tarix", "Anbar", "Status", "Məbləğ (₼)", "Faktura"],
            orders.Select(o => new object?[]
            {
                o.Number, o.Customer.Name, o.OrderDate.ToString("yyyy-MM-dd"), o.Warehouse.Name,
                o.Status switch
                {
                    SalesOrderStatus.Pending => "Gözləyir",
                    SalesOrderStatus.Confirmed => "Təsdiqlənib",
                    _ => "Ləğv edilib"
                },
                o.TotalAmount, o.Invoice?.Number
            }));
    }

    public async Task<ExcelFile> ExportDeliveriesAsync(CancellationToken ct = default)
    {
        var deliveries = await unitOfWork.Repository<Delivery>().Query()
            .Include(d => d.Vehicle)
            .Include(d => d.Driver).ThenInclude(dr => dr.Employee)
            .OrderByDescending(d => d.Id)
            .ToListAsync(ct);

        return Build("Çatdırılmalar", "deliveries",
            ["Nömrə", "Müştəri", "Haradan", "Haraya", "Tarix", "Avtomobil", "Sürücü", "Yük (kq)", "Status"],
            deliveries.Select(d => new object?[]
            {
                d.Number, d.CustomerName, d.FromAddress, d.ToAddress,
                d.ScheduledDate.ToString("yyyy-MM-dd"), d.Vehicle.PlateNumber,
                $"{d.Driver.Employee.FirstName} {d.Driver.Employee.LastName}", d.CargoWeightKg,
                d.Status switch
                {
                    DeliveryStatus.Planned => "Planlaşdırılıb",
                    DeliveryStatus.InTransit => "Yolda",
                    DeliveryStatus.Delivered => "Çatdırılıb",
                    _ => "Ləğv edilib"
                }
            }));
    }

    // ==================== IMPORT ====================

    private static readonly string[] ProductImportHeaders =
        ["Ad", "Barkod", "Kateqoriya", "Vahid", "Alış qiyməti", "Satış qiyməti", "Minimum stok"];

    private static readonly string[] PartnerImportHeaders =
        ["Ad", "Əlaqədar şəxs", "Telefon", "Email", "Ünvan"];

    public ExcelFile GetProductImportTemplate() =>
        BuildTemplate("Məhsullar", "product_import_template", ProductImportHeaders);

    public ExcelFile GetPartnerImportTemplate(string kind) =>
        BuildTemplate(kind == "customers" ? "Müştərilər" : "Təchizatçılar",
            $"{kind}_import_template", PartnerImportHeaders);

    /// <summary>
    /// Məhsul importu — all-or-nothing: hər hansı sətirdə xəta varsa
    /// HEÇ NƏ yazılmır, xətalar sətir nömrəsi ilə qaytarılır.
    /// </summary>
    public async Task<ImportResult> ImportProductsAsync(Stream file, CancellationToken ct = default)
    {
        var result = new ImportResult();
        using var workbook = new XLWorkbook(file);
        var rows = workbook.Worksheets.First().RowsUsed().Skip(1).ToList();

        if (rows.Count == 0)
        {
            result.Errors.Add("Faylda məlumat sətri yoxdur.");
            return result;
        }

        var productRepo = unitOfWork.Repository<Product>();
        var categoryRepo = unitOfWork.Repository<Category>();

        var existingBarcodes = (await productRepo.Query().Select(p => p.Barcode).ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var categories = (await categoryRepo.ListAsync(ct: ct))
            .ToDictionary(c => c.Name, c => c, StringComparer.OrdinalIgnoreCase);
        var seenBarcodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var toAdd = new List<Product>();

        foreach (var row in rows)
        {
            var rowNo = row.RowNumber();
            var name = row.Cell(1).GetString().Trim();
            var barcode = row.Cell(2).GetString().Trim();
            var categoryName = row.Cell(3).GetString().Trim();
            var unit = row.Cell(4).GetString().Trim();

            if (string.IsNullOrEmpty(name)) { result.Errors.Add($"Sətir {rowNo}: ad boşdur."); continue; }
            if (string.IsNullOrEmpty(barcode)) { result.Errors.Add($"Sətir {rowNo}: barkod boşdur."); continue; }
            if (string.IsNullOrEmpty(categoryName)) { result.Errors.Add($"Sətir {rowNo}: kateqoriya boşdur."); continue; }
            if (existingBarcodes.Contains(barcode) || !seenBarcodes.Add(barcode))
            { result.Errors.Add($"Sətir {rowNo}: '{barcode}' barkodu artıq mövcuddur."); continue; }
            if (!row.Cell(5).TryGetValue<decimal>(out var purchasePrice) || purchasePrice < 0)
            { result.Errors.Add($"Sətir {rowNo}: alış qiyməti yanlışdır."); continue; }
            if (!row.Cell(6).TryGetValue<decimal>(out var salePrice) || salePrice < 0)
            { result.Errors.Add($"Sətir {rowNo}: satış qiyməti yanlışdır."); continue; }

            row.Cell(7).TryGetValue<decimal>(out var minStock);

            // Kateqoriya yoxdursa yaradılır
            if (!categories.TryGetValue(categoryName, out var category))
            {
                category = new Category { Name = categoryName };
                categories[categoryName] = category;
            }

            toAdd.Add(new Product
            {
                Name = name,
                Barcode = barcode,
                Category = category,
                Unit = string.IsNullOrEmpty(unit) ? "ədəd" : unit,
                PurchasePrice = purchasePrice,
                SalePrice = salePrice,
                MinStockLevel = minStock
            });
        }

        if (!result.Success) return result;

        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            foreach (var product in toAdd)
                await productRepo.AddAsync(product, token);
        }, ct);

        result.AddedCount = toAdd.Count;
        return result;
    }

    public Task<ImportResult> ImportCustomersAsync(Stream file, CancellationToken ct = default) =>
        ImportPartnersAsync<Customer>(file, "müştəri",
            (name, contact, phone, email, address) => new Customer
            { Name = name, ContactName = contact, Phone = phone, Email = email, Address = address }, ct);

    public Task<ImportResult> ImportSuppliersAsync(Stream file, CancellationToken ct = default) =>
        ImportPartnersAsync<Supplier>(file, "təchizatçı",
            (name, contact, phone, email, address) => new Supplier
            { Name = name, ContactName = contact, Phone = phone, Email = email, Address = address }, ct);

    private async Task<ImportResult> ImportPartnersAsync<T>(
        Stream file, string label,
        Func<string, string?, string?, string?, string?, T> factory,
        CancellationToken ct) where T : Domain.Common.BaseEntity
    {
        var result = new ImportResult();
        using var workbook = new XLWorkbook(file);
        var rows = workbook.Worksheets.First().RowsUsed().Skip(1).ToList();

        if (rows.Count == 0)
        {
            result.Errors.Add("Faylda məlumat sətri yoxdur.");
            return result;
        }

        var repo = unitOfWork.Repository<T>();
        var existingNames = typeof(T) == typeof(Customer)
            ? (await unitOfWork.Repository<Customer>().Query().Select(c => c.Name).ToListAsync(ct))
            : (await unitOfWork.Repository<Supplier>().Query().Select(s => s.Name).ToListAsync(ct));
        var names = existingNames.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var toAdd = new List<T>();

        foreach (var row in rows)
        {
            var rowNo = row.RowNumber();
            var name = row.Cell(1).GetString().Trim();

            if (string.IsNullOrEmpty(name)) { result.Errors.Add($"Sətir {rowNo}: ad boşdur."); continue; }
            if (!names.Add(name)) { result.Errors.Add($"Sətir {rowNo}: '{name}' adlı {label} artıq mövcuddur."); continue; }

            string? Cell(int i)
            {
                var v = row.Cell(i).GetString().Trim();
                return string.IsNullOrEmpty(v) ? null : v;
            }

            toAdd.Add(factory(name, Cell(2), Cell(3), Cell(4), Cell(5)));
        }

        if (!result.Success) return result;

        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            foreach (var entity in toAdd)
                await repo.AddAsync(entity, token);
        }, ct);

        result.AddedCount = toAdd.Count;
        return result;
    }

    // ==================== Köməkçi ====================

    private static ExcelFile Build(
        string title, string filePrefix, string[] headers,
        IEnumerable<object?[]> rows, Action<XLWorkbook>? postProcess = null)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add(title.Length > 31 ? title[..31] : title);

        // Başlıq
        ws.Cell(1, 1).Value = $"SmartERP — {title}";
        ws.Cell(1, 1).Style.Font.SetBold().Font.SetFontSize(14);
        ws.Cell(2, 1).Value = $"Tarix: {DateTime.Now:yyyy-MM-dd HH:mm}";
        ws.Cell(2, 1).Style.Font.SetFontColor(XLColor.Gray);

        // Sütun başlıqları
        const int headerRow = 4;
        for (var i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(headerRow, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.SetBold().Font.SetFontColor(XLColor.White);
            cell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#1e293b"));
        }

        // Sətirlər
        var r = headerRow + 1;
        foreach (var row in rows)
        {
            for (var c = 0; c < row.Length; c++)
            {
                var value = row[c];
                ws.Cell(r, c + 1).Value = value switch
                {
                    null => "",
                    decimal d => d,
                    int i2 => i2,
                    _ => value.ToString()
                };
            }
            r++;
        }

        var table = ws.Range(headerRow, 1, Math.Max(r - 1, headerRow), headers.Length);
        table.SetAutoFilter();
        ws.Columns().AdjustToContents(headerRow, Math.Max(r - 1, headerRow));

        postProcess?.Invoke(workbook);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return new ExcelFile(stream.ToArray(), $"{filePrefix}_{DateTime.Now:yyyy-MM-dd}.xlsx");
    }

    private static ExcelFile BuildTemplate(string title, string filePrefix, string[] headers)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add(title.Length > 31 ? title[..31] : title);

        for (var i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.SetBold().Font.SetFontColor(XLColor.White);
            cell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#1e293b"));
        }
        ws.Columns().AdjustToContents();
        ws.SheetView.FreezeRows(1);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return new ExcelFile(stream.ToArray(), $"{filePrefix}.xlsx");
    }
}
