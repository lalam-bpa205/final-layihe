using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Transport.Dtos;

// ---------- Vehicle ----------
public class VehicleDto
{
    public int Id { get; set; }
    public string PlateNumber { get; set; } = null!;
    public string Brand { get; set; } = null!;
    public string Model { get; set; } = null!;
    public int Year { get; set; }
    public VehicleType Type { get; set; }
    public decimal CapacityKg { get; set; }
    public VehicleStatus Status { get; set; }
}

public record SaveVehicleRequest(
    string PlateNumber,
    string Brand,
    string Model,
    int Year,
    VehicleType Type,
    decimal CapacityKg);

// ---------- Driver ----------
public class DriverDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string FullName { get; set; } = null!;
    public string? Phone { get; set; }
    public string LicenseNumber { get; set; } = null!;
    public string LicenseCategories { get; set; } = null!;
    public DateOnly LicenseExpiryDate { get; set; }
    public DriverStatus Status { get; set; }
}

public record SaveDriverRequest(
    int EmployeeId,
    string LicenseNumber,
    string LicenseCategories,
    DateOnly LicenseExpiryDate);

// ---------- Delivery ----------
public class DeliveryDto
{
    public int Id { get; set; }
    public string Number { get; set; } = null!;
    public string CustomerName { get; set; } = null!;
    public string FromAddress { get; set; } = null!;
    public string ToAddress { get; set; } = null!;
    public DateOnly ScheduledDate { get; set; }
    public string? CargoDescription { get; set; }
    public decimal? CargoWeightKg { get; set; }
    public int VehicleId { get; set; }
    public string VehiclePlate { get; set; } = null!;
    public int DriverId { get; set; }
    public string DriverName { get; set; } = null!;
    public DeliveryStatus Status { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? DeliveredAtUtc { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedDate { get; set; }
}

public record SaveDeliveryRequest(
    string CustomerName,
    string FromAddress,
    string ToAddress,
    DateOnly ScheduledDate,
    int VehicleId,
    int DriverId,
    string? CargoDescription,
    decimal? CargoWeightKg,
    string? Note);

public record DeliveryFilter(
    int Page = 1,
    int PageSize = 10,
    DeliveryStatus? Status = null,
    int? VehicleId = null,
    int? DriverId = null,
    string? Search = null);

// ---------- Fuel / Maintenance ----------
public class FuelRecordDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string VehiclePlate { get; set; } = null!;
    public int? DriverId { get; set; }
    public string? DriverName { get; set; }
    public DateOnly Date { get; set; }
    public decimal Liters { get; set; }
    public decimal Cost { get; set; }
    public int? OdometerKm { get; set; }
    public string? Note { get; set; }
}

public record SaveFuelRecordRequest(
    int VehicleId,
    int? DriverId,
    DateOnly Date,
    decimal Liters,
    decimal Cost,
    int? OdometerKm,
    string? Note);

public class MaintenanceRecordDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string VehiclePlate { get; set; } = null!;
    public DateOnly Date { get; set; }
    public string Description { get; set; } = null!;
    public decimal Cost { get; set; }
    public DateOnly? NextDueDate { get; set; }
}

public record SaveMaintenanceRecordRequest(
    int VehicleId,
    DateOnly Date,
    string Description,
    decimal Cost,
    DateOnly? NextDueDate);

// ---------- Analitika: modul icmalı ----------
public class TransportSummaryDto
{
    public VehicleCountsDto Vehicles { get; set; } = null!;
    public DriverCountsDto Drivers { get; set; } = null!;
    public int ActiveDeliveryCount { get; set; }
    public MonthDeliveryStatsDto DeliveriesThisMonth { get; set; } = null!;
    public decimal MonthFuelCost { get; set; }
    public decimal MonthMaintenanceCost { get; set; }
    public List<DriverDto> ExpiringLicenses { get; set; } = [];
    public List<TopDriverDto> TopDrivers { get; set; } = [];
    public List<DeliveryDto> RecentDeliveries { get; set; } = [];
}

public class VehicleCountsDto
{
    public int Total { get; set; }
    public int Active { get; set; }
    public int OnTrip { get; set; }
    public int InMaintenance { get; set; }
    public int Inactive { get; set; }
}

public class DriverCountsDto
{
    public int Total { get; set; }
    public int Available { get; set; }
    public int OnTrip { get; set; }
}

public class MonthDeliveryStatsDto
{
    public int Total { get; set; }
    public int Delivered { get; set; }
    public int Cancelled { get; set; }
}

public class TopDriverDto
{
    public int DriverId { get; set; }
    public string FullName { get; set; } = null!;
    public int DeliveredCount { get; set; }
}

// ---------- Analitika: avtomobil detalları ----------
public class VehicleDetailsDto
{
    public VehicleDto Vehicle { get; set; } = null!;
    public VehicleTotalsDto Totals { get; set; } = null!;
    public List<MonthlyCostDto> MonthlyCosts { get; set; } = [];
    public List<FuelRecordDto> RecentFuelRecords { get; set; } = [];
    public List<MaintenanceRecordDto> RecentMaintenance { get; set; } = [];
    public List<DeliveryDto> RecentDeliveries { get; set; } = [];
}

public class VehicleTotalsDto
{
    public decimal FuelCost { get; set; }
    public decimal FuelLiters { get; set; }
    public decimal MaintenanceCost { get; set; }
    public int DeliveryCount { get; set; }
    public int DeliveredCount { get; set; }
}

public class MonthlyCostDto
{
    /// <summary>Ay: "yyyy-MM" formatında.</summary>
    public string Month { get; set; } = null!;
    public decimal FuelCost { get; set; }
    public decimal MaintenanceCost { get; set; }
}
