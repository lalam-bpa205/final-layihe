using SmartERP.Domain.Common;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Finance;

public class Invoice : BaseEntity
{
    /// <summary>Sənəd nömrəsi: INV-00001</summary>
    public string Number { get; set; } = null!;

    public string CustomerName { get; set; } = null!;
    public DateOnly IssueDate { get; set; }
    public DateOnly DueDate { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Unpaid;
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }

    public ICollection<InvoiceItem> Items { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
}

public class InvoiceItem : BaseEntity
{
    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public string Description { get; set; } = null!;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class Payment : BaseEntity
{
    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public string? Note { get; set; }
}
