using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Entities.Finance;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Entities.Inventory;
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

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(CancellationToken ct = default);
}

public class DashboardService(IUnitOfWork unitOfWork) : IDashboardService
{
    public async Task<DashboardDto> GetAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var sixMonthsAgo = monthStart.AddMonths(-5);

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
                        ? m.Quantity : -m.Quantity) <= p.MinStockLevel, ct)
        };

        // Ödənilməmiş fakturalar
        var unpaid = await unitOfWork.Repository<Invoice>().Query()
            .Where(i => i.Status == InvoiceStatus.Unpaid || i.Status == InvoiceStatus.PartiallyPaid)
            .Select(i => new { i.TotalAmount, Paid = i.Payments.Sum(p => p.Amount) })
            .ToListAsync(ct);
        dto.UnpaidInvoiceCount = unpaid.Count;
        dto.UnpaidInvoiceAmount = unpaid.Sum(x => x.TotalAmount - x.Paid);

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

        return dto;
    }
}
