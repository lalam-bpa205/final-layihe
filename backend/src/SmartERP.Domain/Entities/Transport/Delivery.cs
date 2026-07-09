using SmartERP.Domain.Common;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Transport;

public class Delivery : BaseEntity
{
    /// <summary>Sənəd nömrəsi: DLV-00001</summary>
    public string Number { get; set; } = null!;

    public string CustomerName { get; set; } = null!;
    public string FromAddress { get; set; } = null!;
    public string ToAddress { get; set; } = null!;
    public DateOnly ScheduledDate { get; set; }

    public string? CargoDescription { get; set; }
    public decimal? CargoWeightKg { get; set; }

    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    public int DriverId { get; set; }
    public Driver Driver { get; set; } = null!;

    public DeliveryStatus Status { get; set; } = DeliveryStatus.Planned;
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? DeliveredAtUtc { get; set; }
    public string? Note { get; set; }
}
