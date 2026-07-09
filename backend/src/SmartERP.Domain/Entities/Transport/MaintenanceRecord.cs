using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Transport;

public class MaintenanceRecord : BaseEntity
{
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    public DateOnly Date { get; set; }
    public string Description { get; set; } = null!;
    public decimal Cost { get; set; }

    /// <summary>Növbəti texniki baxışın tarixi</summary>
    public DateOnly? NextDueDate { get; set; }
}
