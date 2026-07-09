using SmartERP.Domain.Common;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Finance;

/// <summary>Gəlir/xərc kateqoriyası (məs. "Yanacaq", "Maaşlar", "Satış").</summary>
public class TransactionCategory : BaseEntity
{
    public string Name { get; set; } = null!;
    public TransactionType Type { get; set; }

    public ICollection<FinanceTransaction> Transactions { get; set; } = [];
    public ICollection<Budget> Budgets { get; set; } = [];
}
