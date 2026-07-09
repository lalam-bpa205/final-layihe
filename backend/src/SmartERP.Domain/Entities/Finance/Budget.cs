using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Finance;

/// <summary>
/// Aylıq xərc büdcəsi. Xərclənən məbləğ saxlanmır —
/// həmin ayın xərc tranzaksiyalarından hesablanır.
/// </summary>
public class Budget : BaseEntity
{
    public int Year { get; set; }
    public int Month { get; set; }

    public int CategoryId { get; set; }
    public TransactionCategory Category { get; set; } = null!;

    public decimal LimitAmount { get; set; }
}
