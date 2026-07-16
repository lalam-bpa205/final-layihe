using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Transport.Fuel;

/// <summary>Yanacaq mənbəyi — anbar (stoklu) və ya xarici doldurma məntəqəsi.</summary>
public class FuelSourceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public FuelSourceType Type { get; set; }
    public string? Address { get; set; }
    public decimal CurrentLiters { get; set; }
    public decimal CapacityLiters { get; set; }
    public bool IsActive { get; set; }

    /// <summary>Bu mənbədən indiyədək avtomobillərə köçürülmüş ümumi yanacaq (litr).</summary>
    public decimal TotalTransferredLiters { get; set; }
    public int TransferCount { get; set; }
}

public record SaveFuelSourceRequest(
    string Name,
    FuelSourceType Type,
    string? Address,
    decimal CapacityLiters);

/// <summary>Anbara yanacaq mədaxili.</summary>
public record ReplenishFuelSourceRequest(decimal Liters, string? Note);

/// <summary>Mənbədən avtomobilə yanacaq köçürməsi.</summary>
public record FuelTransferRequest(
    int FuelSourceId,
    int VehicleId,
    int? DriverId,
    DateOnly Date,
    decimal Liters,
    decimal Cost,
    int? OdometerKm,
    string? Note);

/// <summary>
/// Avtomobil üzrə yanacaq sərfiyyatı — köçürülmüş litrlər GPS-dən gələn
/// ümumi məsafəyə bölünərək km başına sərfiyyat hesablanır.
/// </summary>
public class VehicleFuelConsumptionDto
{
    public int VehicleId { get; set; }
    public string PlateNumber { get; set; } = null!;
    public string Brand { get; set; } = null!;
    public string Model { get; set; } = null!;

    public decimal TotalLiters { get; set; }
    public decimal TotalCost { get; set; }
    public int TransferCount { get; set; }

    /// <summary>GPS izinə əsasən qət edilmiş ümumi məsafə (km).</summary>
    public double DistanceKm { get; set; }

    /// <summary>100 km-ə düşən yanacaq (litr) — sənaye standartı göstərici.</summary>
    public double LitersPer100Km { get; set; }

    /// <summary>1 km-ə düşən yanacaq (litr).</summary>
    public double LitersPerKm { get; set; }

    /// <summary>1 km-ə düşən yanacaq xərci (₼).</summary>
    public decimal CostPerKm { get; set; }

    /// <summary>Orta litr qiyməti (₼).</summary>
    public decimal AvgPricePerLiter { get; set; }
}

/// <summary>Bütün park üzrə yanacaq xülasəsi.</summary>
public class FuelSummaryDto
{
    public List<VehicleFuelConsumptionDto> Vehicles { get; set; } = [];
    public decimal TotalLiters { get; set; }
    public decimal TotalCost { get; set; }
    public double TotalDistanceKm { get; set; }
    public double FleetLitersPer100Km { get; set; }
    public decimal DepotLitersRemaining { get; set; }
}
