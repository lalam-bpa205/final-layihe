using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Transport;

public class FuelRecord : BaseEntity
{
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    public int? DriverId { get; set; }
    public Driver? Driver { get; set; }

    public DateOnly Date { get; set; }
    public decimal Liters { get; set; }
    public decimal Cost { get; set; }
    public int? OdometerKm { get; set; }
    public string? Note { get; set; }
}
