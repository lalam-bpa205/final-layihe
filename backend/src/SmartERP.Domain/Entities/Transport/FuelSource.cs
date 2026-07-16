using SmartERP.Domain.Common;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Transport;

/// <summary>
/// Yanacağın köçürüldüyü mənbə — şirkətin öz anbarı və ya xarici doldurma məntəqəsi.
/// Anbar tipində köçürmə stokdan çıxılır, məntəqə tipində stok izlənmir.
/// </summary>
public class FuelSource : BaseEntity
{
    public string Name { get; set; } = null!;
    public FuelSourceType Type { get; set; }
    public string? Address { get; set; }

    /// <summary>Anbardakı cari yanacaq (litr). Yalnız <see cref="FuelSourceType.Depot"/> üçün mənalıdır.</summary>
    public decimal CurrentLiters { get; set; }

    /// <summary>Anbarın maksimum tutumu (litr).</summary>
    public decimal CapacityLiters { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<FuelRecord> FuelRecords { get; set; } = [];
}
