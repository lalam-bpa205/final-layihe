using MapsterMapper;
using Mapster;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Sales.Dtos;
using SmartERP.Domain.Entities.Sales;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Sales;

public interface ISalesOverviewService
{
    Task<SalesOverviewDto> GetOverviewAsync(CancellationToken ct = default);
}

/// <summary>
/// Satış modulunun icmal/analitika servisi:
/// cari ayın satış/alış göstəriciləri, gözləyən sifarişlər,
/// ən yaxşı müştərilər, son 6 ayın trendi və son satış sifarişləri.
/// </summary>
public class SalesOverviewService(
    IUnitOfWork unitOfWork,
    IMapper mapper) : ISalesOverviewService
{
    public async Task<SalesOverviewDto> GetOverviewAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var nextMonthStart = monthStart.AddMonths(1);
        var sixMonthsStart = monthStart.AddMonths(-5); // son 6 ay (cari daxil)

        var salesRepo = unitOfWork.Repository<SalesOrder>();
        var purchaseRepo = unitOfWork.Repository<PurchaseOrder>();

        // ---- Cari ayın satış sifarişləri ----
        var monthSalesCount = await salesRepo.Query()
            .CountAsync(o => o.OrderDate >= monthStart && o.OrderDate < nextMonthStart
                && o.Status != SalesOrderStatus.Cancelled, ct);

        var monthSalesAmount = await salesRepo.Query()
            .Where(o => o.OrderDate >= monthStart && o.OrderDate < nextMonthStart
                && o.Status == SalesOrderStatus.Confirmed)
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0;

        // ---- Cari ayın alış sifarişləri ----
        var monthPurchaseCount = await purchaseRepo.Query()
            .CountAsync(o => o.OrderDate >= monthStart && o.OrderDate < nextMonthStart
                && o.Status != PurchaseOrderStatus.Cancelled, ct);

        var monthPurchaseAmount = await purchaseRepo.Query()
            .Where(o => o.OrderDate >= monthStart && o.OrderDate < nextMonthStart
                && o.Status == PurchaseOrderStatus.Received)
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0;

        // ---- Gözləyən sifarişlər (bütün zamanlar) ----
        var pendingSalesCount = await salesRepo.Query()
            .CountAsync(o => o.Status == SalesOrderStatus.Pending, ct);
        var pendingPurchaseCount = await purchaseRepo.Query()
            .CountAsync(o => o.Status == PurchaseOrderStatus.Pending, ct);

        // ---- Ən yaxşı müştərilər (təsdiqlənmiş sifarişlər üzrə, top 5) ----
        var topCustomers = await salesRepo.Query()
            .Where(o => o.Status == SalesOrderStatus.Confirmed)
            .GroupBy(o => new { o.CustomerId, o.Customer.Name })
            .Select(g => new TopCustomerDto
            {
                CustomerId = g.Key.CustomerId,
                Name = g.Key.Name,
                OrderCount = g.Count(),
                TotalAmount = g.Sum(o => o.TotalAmount)
            })
            .OrderByDescending(x => x.TotalAmount)
            .Take(5)
            .ToListAsync(ct);

        // ---- Son 6 ayın trendi: təsdiqlənmiş satış / qəbul edilmiş alış ----
        var salesByMonth = await salesRepo.Query()
            .Where(o => o.Status == SalesOrderStatus.Confirmed
                && o.OrderDate >= sixMonthsStart && o.OrderDate < nextMonthStart)
            .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(o => o.TotalAmount) })
            .ToListAsync(ct);

        var purchasesByMonth = await purchaseRepo.Query()
            .Where(o => o.Status == PurchaseOrderStatus.Received
                && o.OrderDate >= sixMonthsStart && o.OrderDate < nextMonthStart)
            .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(o => o.TotalAmount) })
            .ToListAsync(ct);

        var monthlyTrend = new List<SalesTrendPointDto>(6);
        for (var i = 0; i < 6; i++)
        {
            var m = sixMonthsStart.AddMonths(i);
            monthlyTrend.Add(new SalesTrendPointDto
            {
                Month = $"{m.Year:D4}-{m.Month:D2}",
                Sales = salesByMonth
                    .Where(x => x.Year == m.Year && x.Month == m.Month)
                    .Sum(x => x.Amount),
                Purchases = purchasesByMonth
                    .Where(x => x.Year == m.Year && x.Month == m.Month)
                    .Sum(x => x.Amount)
            });
        }

        // ---- Son satış sifarişləri ----
        var recentSalesOrders = await salesRepo.Query()
            .OrderByDescending(o => o.Id)
            .Take(8)
            .ProjectToType<SalesOrderDto>()
            .ToListAsync(ct);

        return new SalesOverviewDto
        {
            MonthSales = new OrderBucketDto { OrderCount = monthSalesCount, Amount = monthSalesAmount },
            MonthPurchases = new OrderBucketDto { OrderCount = monthPurchaseCount, Amount = monthPurchaseAmount },
            PendingSalesCount = pendingSalesCount,
            PendingPurchaseCount = pendingPurchaseCount,
            TopCustomers = topCustomers,
            MonthlyTrend = monthlyTrend,
            RecentSalesOrders = recentSalesOrders
        };
    }
}
