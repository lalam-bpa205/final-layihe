using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Finance.Dtos;

// ---------- Category ----------
public class TransactionCategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public TransactionType Type { get; set; }
    public int TransactionCount { get; set; }
}

public record SaveTransactionCategoryRequest(string Name, TransactionType Type);

// ---------- Transaction ----------
public class FinanceTransactionDto
{
    public int Id { get; set; }
    public TransactionType Type { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = null!;
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public string? Description { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? CreatedBy { get; set; }
}

public record SaveFinanceTransactionRequest(
    TransactionType Type,
    int CategoryId,
    DateOnly Date,
    decimal Amount,
    PaymentMethod Method,
    string? Description);

public record FinanceTransactionFilter(
    int Page = 1,
    int PageSize = 10,
    TransactionType? Type = null,
    int? CategoryId = null,
    DateOnly? From = null,
    DateOnly? To = null);

// ---------- Budget ----------
public class BudgetDto
{
    public int Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = null!;
    public decimal LimitAmount { get; set; }
    public decimal SpentAmount { get; set; }
    public decimal UsagePercent => LimitAmount == 0 ? 0 : Math.Round(SpentAmount / LimitAmount * 100, 1);
    public bool IsOverBudget => SpentAmount > LimitAmount;
}

public record SaveBudgetRequest(int Year, int Month, int CategoryId, decimal LimitAmount);

// ---------- Invoice ----------
public class InvoiceItemDto
{
    public int Id { get; set; }
    public string Description { get; set; } = null!;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class PaymentDto
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public string? Note { get; set; }
}

public class InvoiceDto
{
    public int Id { get; set; }
    public string Number { get; set; } = null!;
    public string CustomerName { get; set; } = null!;
    public DateOnly IssueDate { get; set; }
    public DateOnly DueDate { get; set; }
    public InvoiceStatus Status { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount => TotalAmount - PaidAmount;
    public string? Note { get; set; }
    public List<InvoiceItemDto> Items { get; set; } = [];
    public List<PaymentDto> Payments { get; set; } = [];
}

public record InvoiceItemRequest(string Description, decimal Quantity, decimal UnitPrice);

public record SaveInvoiceRequest(
    string CustomerName,
    DateOnly IssueDate,
    DateOnly DueDate,
    string? Note,
    List<InvoiceItemRequest> Items);

public record AddPaymentRequest(DateOnly Date, decimal Amount, PaymentMethod Method, string? Note);

public record InvoiceFilter(
    int Page = 1,
    int PageSize = 10,
    InvoiceStatus? Status = null,
    string? Search = null);

// ---------- Summary ----------
public class FinanceSummaryDto
{
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal Profit => TotalIncome - TotalExpense;
    public List<CategorySummaryDto> IncomeByCategory { get; set; } = [];
    public List<CategorySummaryDto> ExpenseByCategory { get; set; } = [];
}

public class CategorySummaryDto
{
    public string CategoryName { get; set; } = null!;
    public decimal Amount { get; set; }
}

// ---------- Overview (icmal/analitika) ----------
public class FinanceOverviewDto
{
    public decimal MonthIncome { get; set; }
    public decimal MonthExpense { get; set; }
    public decimal MonthProfit => MonthIncome - MonthExpense;
    public InvoiceBucketDto UnpaidInvoices { get; set; } = new();
    public InvoiceBucketDto OverdueInvoices { get; set; } = new();
    public List<CashflowPointDto> Cashflow { get; set; } = [];
    public List<NamedAmountDto> ExpenseByCategory { get; set; } = [];
    public List<InvoiceDto> UpcomingInvoices { get; set; } = [];
    public List<FinanceTransactionDto> RecentTransactions { get; set; } = [];
}

/// <summary>Faktura qrupu: say + qalıq borc cəmi.</summary>
public class InvoiceBucketDto
{
    public int Count { get; set; }
    public decimal Amount { get; set; }
}

/// <summary>Aylıq pul axını nöqtəsi ("yyyy-MM").</summary>
public class CashflowPointDto
{
    public string Month { get; set; } = null!;
    public decimal Income { get; set; }
    public decimal Expense { get; set; }
}

public class NamedAmountDto
{
    public string Name { get; set; } = null!;
    public decimal Amount { get; set; }
}
