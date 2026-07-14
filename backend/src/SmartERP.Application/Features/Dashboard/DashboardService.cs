using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Entities.Auth;
using SmartERP.Domain.Entities.Finance;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Entities.Sales;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Dashboard;

public class DashboardDto
{
    public int EmployeeCount { get; set; }
    public int ProductCount { get; set; }
    public int LowStockCount { get; set; }
    public int VehicleCount { get; set; }
    public int ActiveDeliveryCount { get; set; }
    public int PendingLeaveCount { get; set; }
    public int UnpaidInvoiceCount { get; set; }
    public decimal UnpaidInvoiceAmount { get; set; }
    public decimal MonthIncome { get; set; }
    public decimal MonthExpense { get; set; }
    public List<MonthlyFinancePoint> MonthlyFinance { get; set; } = [];
    public List<CategoryPoint> ExpenseByCategory { get; set; } = [];

    // --- Admin idarəetmə paneli üçün əlavə göstəricilər ---
    public int CustomerCount { get; set; }
    public int SupplierCount { get; set; }

    /// <summary>Aktiv istifadəçilərin sayı.</summary>
    public int UserCount { get; set; }

    /// <summary>Anbardakı stokun alış qiyməti ilə ümumi dəyəri.</summary>
    public decimal TotalStockValue { get; set; }

    /// <summary>Vaxtı keçmiş (ödəniş tarixi bugündən əvvəl) fakturaların sayı.</summary>
    public int OverdueInvoiceCount { get; set; }

    /// <summary>Vaxtı keçmiş fakturalar üzrə qalıq borc.</summary>
    public decimal OverdueInvoiceAmount { get; set; }

    public decimal MonthSalesAmount { get; set; }
    public decimal MonthPurchaseAmount { get; set; }
    public int MonthDeliveredCount { get; set; }

    /// <summary>Gözləyən satış + alış sifarişləri.</summary>
    public int PendingOrdersCount { get; set; }

    public List<ModuleActivityPoint> ModulesActivity { get; set; } = [];
    public List<RecentActivityPoint> RecentActivity { get; set; } = [];
    public List<TopUserPoint> TopUsers { get; set; } = [];
}

public class MonthlyFinancePoint
{
    public string Month { get; set; } = null!; // "2026-07"
    public decimal Income { get; set; }
    public decimal Expense { get; set; }
}

public class CategoryPoint
{
    public string Name { get; set; } = null!;
    public decimal Amount { get; set; }
}

/// <summary>Modul üzrə əsas obyektlərin sayı.</summary>
public class ModuleActivityPoint
{
    public string Module { get; set; } = null!;
    public int RecordCount { get; set; }
}

/// <summary>Audit jurnalından son əməliyyat.</summary>
public class RecentActivityPoint
{
    public string UserName { get; set; } = null!;
    public string Action { get; set; } = null!;
    public string EntityType { get; set; } = null!;
    public int EntityId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

/// <summary>Son 30 gündə ən aktiv istifadəçi.</summary>
public class TopUserPoint
{
    public string UserName { get; set; } = null!;
    public int ActionCount { get; set; }
}

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(CancellationToken ct = default);
}

/// <summary>
/// Admin idarəetmə panelinin məlumat servisi: bütün modulların
/// əsas göstəriciləri, maliyyə trendi və sistem aktivliyi (audit jurnalı).
/// </summary>
public class DashboardService(IUnitOfWork unitOfWork, IAuditLogReader auditLogReader) : IDashboardService
{
    public async Task<DashboardDto> GetAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var nextMonthStart = monthStart.AddMonths(1);
        var sixMonthsAgo = monthStart.AddMonths(-5);

        // Çatdırılmalar UTC vaxt möhürü ilə saxlanılır — ay sərhədini UTC-də hesablayırıq.
        var utcNow = DateTime.UtcNow;
        var monthStartUtc = new DateTime(utcNow.Year, utcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextMonthStartUtc = monthStartUtc.AddMonths(1);
        var thirtyDaysAgoUtc = utcNow.AddDays(-30);

        var dto = new DashboardDto
        {
            EmployeeCount = await unitOfWork.Repository<Employee>().CountAsync(ct: ct),
            ProductCount = await unitOfWork.Repository<Product>().CountAsync(ct: ct),
            VehicleCount = await unitOfWork.Repository<Vehicle>().CountAsync(ct: ct),
            ActiveDeliveryCount = await unitOfWork.Repository<Delivery>()
                .CountAsync(d => d.Status == DeliveryStatus.InTransit, ct),
            PendingLeaveCount = await unitOfWork.Repository<LeaveRequest>()
                .CountAsync(lr => lr.Status == LeaveStatus.Pending, ct),
            LowStockCount = await unitOfWork.Repository<Product>().Query()
                .CountAsync(p => p.StockMovements.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity : -m.Quantity) <= p.MinStockLevel, ct),
            CustomerCount = await unitOfWork.Repository<Customer>().CountAsync(ct: ct),
            SupplierCount = await unitOfWork.Repository<Supplier>().CountAsync(ct: ct),
            UserCount = await unitOfWork.Repository<User>().CountAsync(u => u.IsActive, ct)
        };

        // Anbarın ümumi dəyəri: mənfi balanslar 0 sayılır
        var stock = await unitOfWork.Repository<Product>().Query()
            .Select(p => new
            {
                p.PurchasePrice,
                Balance = p.StockMovements.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity : -m.Quantity)
            })
            .ToListAsync(ct);
        dto.TotalStockValue = stock.Sum(x => Math.Max(x.Balance, 0) * x.PurchasePrice);

        // Ödənilməmiş fakturalar (+ vaxtı keçmişlər)
        var unpaid = await unitOfWork.Repository<Invoice>().Query()
            .Where(i => i.Status == InvoiceStatus.Unpaid || i.Status == InvoiceStatus.PartiallyPaid)
            .Select(i => new { i.TotalAmount, i.DueDate, Paid = i.Payments.Sum(p => p.Amount) })
            .ToListAsync(ct);
        dto.UnpaidInvoiceCount = unpaid.Count;
        dto.UnpaidInvoiceAmount = unpaid.Sum(x => x.TotalAmount - x.Paid);

        var overdue = unpaid.Where(x => x.DueDate < today).ToList();
        dto.OverdueInvoiceCount = overdue.Count;
        dto.OverdueInvoiceAmount = overdue.Sum(x => x.TotalAmount - x.Paid);

        // Son 6 ayın gəlir/xərci (qrafik üçün)
        var monthly = await unitOfWork.Repository<FinanceTransaction>().Query()
            .Where(t => t.Date >= sixMonthsAgo)
            .GroupBy(t => new { t.Date.Year, t.Date.Month, t.Type })
            .Select(g => new { g.Key.Year, g.Key.Month, g.Key.Type, Amount = g.Sum(t => t.Amount) })
            .ToListAsync(ct);

        for (var m = sixMonthsAgo; m <= monthStart; m = m.AddMonths(1))
        {
            dto.MonthlyFinance.Add(new MonthlyFinancePoint
            {
                Month = $"{m.Year}-{m.Month:D2}",
                Income = monthly.Where(x => x.Year == m.Year && x.Month == m.Month && x.Type == TransactionType.Income).Sum(x => x.Amount),
                Expense = monthly.Where(x => x.Year == m.Year && x.Month == m.Month && x.Type == TransactionType.Expense).Sum(x => x.Amount)
            });
        }

        var current = dto.MonthlyFinance.Last();
        dto.MonthIncome = current.Income;
        dto.MonthExpense = current.Expense;

        // Xərclər kateqoriya üzrə (cari ay)
        dto.ExpenseByCategory = await unitOfWork.Repository<FinanceTransaction>().Query()
            .Where(t => t.Type == TransactionType.Expense && t.Date >= monthStart)
            .GroupBy(t => t.Category.Name)
            .Select(g => new CategoryPoint { Name = g.Key, Amount = g.Sum(t => t.Amount) })
            .OrderByDescending(x => x.Amount)
            .Take(6)
            .ToListAsync(ct);

        // Cari ayın satış / alış / çatdırılma göstəriciləri
        var salesRepo = unitOfWork.Repository<SalesOrder>();
        var purchaseRepo = unitOfWork.Repository<PurchaseOrder>();

        dto.MonthSalesAmount = await salesRepo.Query()
            .Where(o => o.Status == SalesOrderStatus.Confirmed
                && o.OrderDate >= monthStart && o.OrderDate < nextMonthStart)
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0;

        dto.MonthPurchaseAmount = await purchaseRepo.Query()
            .Where(o => o.Status == PurchaseOrderStatus.Received
                && o.OrderDate >= monthStart && o.OrderDate < nextMonthStart)
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0;

        dto.MonthDeliveredCount = await unitOfWork.Repository<Delivery>().Query()
            .CountAsync(d => d.Status == DeliveryStatus.Delivered
                && d.DeliveredAtUtc >= monthStartUtc && d.DeliveredAtUtc < nextMonthStartUtc, ct);

        var pendingSales = await salesRepo.CountAsync(o => o.Status == SalesOrderStatus.Pending, ct);
        var pendingPurchases = await purchaseRepo.CountAsync(o => o.Status == PurchaseOrderStatus.Pending, ct);
        dto.PendingOrdersCount = pendingSales + pendingPurchases;

        // Modul üzrə aktivlik (əsas obyektlərin sayı)
        var deliveryCount = await unitOfWork.Repository<Delivery>().CountAsync(ct: ct);
        var financeCount = await unitOfWork.Repository<FinanceTransaction>().CountAsync(ct: ct);
        var salesOrderCount = await salesRepo.CountAsync(ct: ct);
        var purchaseOrderCount = await purchaseRepo.CountAsync(ct: ct);

        dto.ModulesActivity =
        [
            new() { Module = "İnsan Resursları", RecordCount = dto.EmployeeCount },
            new() { Module = "Anbar", RecordCount = dto.ProductCount },
            new() { Module = "Nəqliyyat", RecordCount = deliveryCount },
            new() { Module = "Maliyyə", RecordCount = financeCount },
            new() { Module = "Satış", RecordCount = salesOrderCount + purchaseOrderCount }
        ];

        // Sistem aktivliyi (audit jurnalı)
        var recent = await auditLogReader.GetRecentAsync(10, ct);
        dto.RecentActivity = recent.Select(a => new RecentActivityPoint
        {
            UserName = a.UserName,
            Action = a.Action,
            EntityType = a.EntityType,
            EntityId = a.EntityId,
            CreatedAtUtc = a.CreatedAtUtc
        }).ToList();

        var topUsers = await auditLogReader.GetTopUsersAsync(thirtyDaysAgoUtc, 5, ct);
        dto.TopUsers = topUsers.Select(u => new TopUserPoint
        {
            UserName = u.UserName,
            ActionCount = u.ActionCount
        }).ToList();

        return dto;
    }
}
