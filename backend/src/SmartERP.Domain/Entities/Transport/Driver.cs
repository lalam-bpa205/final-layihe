using SmartERP.Domain.Common;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Transport;

/// <summary>Sürücü — mövcud işçiyə (Employee) bağlanır.</summary>
public class Driver : BaseEntity
{
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    public string LicenseNumber { get; set; } = null!;

    /// <summary>Sürücülük kateqoriyaları: B, C, CE və s.</summary>
    public string LicenseCategories { get; set; } = null!;

    public DateOnly LicenseExpiryDate { get; set; }

    public DriverStatus Status { get; set; } = DriverStatus.Available;

    public ICollection<Delivery> Deliveries { get; set; } = [];
}
