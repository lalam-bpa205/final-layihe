using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Finance.Dtos;
using SmartERP.Domain.Entities.Finance;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Finance;

public interface IFinanceOverviewService
{
    Task<FinanceOverviewDto> GetOverviewAsync(CancellationToken ct = default);
}

/// <summary>
/// Maliyyə modulunun icmal/analitika servisi:
/// cari ay gəlir-xərc, ödənilməmiş/gecikmiş fakturalar,
/// son 6 ayın pul axını, xərc kateqoriyaları və son əməliyyatlar.
/// </summary>
public class FinanceOverviewService(
    IUnitOfWork unitOfWork,
    IMapper mapper) : IFinanceOverviewService
{
    public async Task<FinanceOverviewDto> GetOverviewAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var nextMonthStart = monthStart.AddMonths(1);
        var sixMonthsStart = monthStart.AddMonths(-5); // son 6 ay (cari daxil)

        // ---- Son 6 ayın əməliyyatları: ay + tip üzrə qruplaşdırma ----
        var txByMonth = await unitOfWork.Repository<FinanceTransaction>().Query()
            .Where(t => t.Date >= sixMonthsStart && t.Date < nextMonthStart)
            .GroupBy(t => new { t.Date.Year, t.Date.Month, t.Type })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                g.Key.Type,
                Amount = g.Sum(t => t.Amount)
            })
            .ToListAsync(ct);

        var cashflow = new List<CashflowPointDto>(6);
        for (var i = 0; i < 6; i++)
        {
            var m = sixMonthsStart.AddMonths(i);
            cashflow.Add(new CashflowPointDto
            {
                Month = $"{m.Year:D4}-{m.Month:D2}",
                Income = txByMonth
                    .Where(x => x.Year == m.Year && x.Month == m.Month && x.Type == TransactionType.Income)
                    .Sum(x => x.Amount),
                Expense = txByMonth
                    .Where(x => x.Year == m.Year && x.Month == m.Month && x.Type == TransactionType.Expense)
                    .Sum(x => x.Amount)
            });
        }

        var currentPoint = cashflow[^1];

        // ---- Ödənilməmiş fakturalar (qalıq borc) ----
        var openInvoices = await unitOfWork.Repository<Invoice>().Query()
            .Where(i => i.Status == InvoiceStatus.Unpaid || i.Status == InvoiceStatus.PartiallyPaid)
            .Select(i => new
            {
                i.DueDate,
                Remaining = i.TotalAmount - (i.Payments.Sum(p => (decimal?)p.Amount) ?? 0)
            })
            .ToListAsync(ct);

        var overdue = openInvoices.Where(i => i.DueDate < today).ToList();

        // ---- Cari ayın xərcləri kateqoriya üzrə (top 6) ----
        var expenseByCategory = await unitOfWork.Repository<FinanceTransaction>().Query()
            .Where(t => t.Type == TransactionType.Expense
                && t.Date >= monthStart && t.Date < nextMonthStart)
            .GroupBy(t => t.Category.Name)
            .Select(g => new NamedAmountDto { Name = g.Key, Amount = g.Sum(t => t.Amount) })
            .OrderByDescending(x => x.Amount)
            .Take(6)
            .ToListAsync(ct);

        // ---- Yaxınlaşan fakturalar (7 gün ərzində, ilk 5) ----
        var upcomingLimit = today.AddDays(7);
        var upcomingInvoices = await unitOfWork.Repository<Invoice>().Query()
            .Where(i => (i.Status == InvoiceStatus.Unpaid || i.Status == InvoiceStatus.PartiallyPaid)
                && i.DueDate >= today && i.DueDate <= upcomingLimit)
            .OrderBy(i => i.DueDate).ThenBy(i => i.Id)
            .Take(5)
            .ProjectTo<InvoiceDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);

        // ---- Son əməliyyatlar ----
        var recentTransactions = await unitOfWork.Repository<FinanceTransaction>().Query()
            .OrderByDescending(t => t.Date).ThenByDescending(t => t.Id)
            .Take(8)
            .ProjectTo<FinanceTransactionDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);

        return new FinanceOverviewDto
        {
            MonthIncome = currentPoint.Income,
            MonthExpense = currentPoint.Expense,
            UnpaidInvoices = new InvoiceBucketDto
            {
                Count = openInvoices.Count,
                Amount = openInvoices.Sum(i => i.Remaining)
            },
            OverdueInvoices = new InvoiceBucketDto
            {
                Count = overdue.Count,
                Amount = overdue.Sum(i => i.Remaining)
            },
            Cashflow = cashflow,
            ExpenseByCategory = expenseByCategory,
            UpcomingInvoices = upcomingInvoices,
            RecentTransactions = recentTransactions
        };
    }
}
