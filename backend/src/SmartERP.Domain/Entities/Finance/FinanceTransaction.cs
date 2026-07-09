using SmartERP.Domain.Common;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Finance;

public class FinanceTransaction : BaseEntity
{
    public TransactionType Type { get; set; }

    public int CategoryId { get; set; }
    public TransactionCategory Category { get; set; } = null!;

    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public string? Description { get; set; }

    /// <summary>Faktura ödənişindən avtomatik yaranıbsa — mənbə faktura.</summary>
    public int? InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
}
