using SmartERP.Domain.Common;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Transport;

public class Vehicle : BaseEntity
{
    public string PlateNumber { get; set; } = null!;
    public string Brand { get; set; } = null!;
    public string Model { get; set; } = null!;
    public int Year { get; set; }
    public VehicleType Type { get; set; }

    /// <summary>Yük tutumu (kq)</summary>
    public decimal CapacityKg { get; set; }

    public VehicleStatus Status { get; set; } = VehicleStatus.Active;

    public ICollection<Delivery> Deliveries { get; set; } = [];
    public ICollection<FuelRecord> FuelRecords { get; set; } = [];
    public ICollection<MaintenanceRecord> MaintenanceRecords { get; set; } = [];
}
