using SmartERP.Domain.Common;

namespace SmartERP.Domain.Entities.Transport;

/// <summary>
/// Avtomobilin GPS mövqe qeydi. Real GPS qurğusu olmadığından qeydlər
/// simulyator tərəfindən yaradılır (Azərbaycan marşrutları boyunca).
/// GPS izləri çox sayda olduğundan audit jurnalına yazılmır (bax: AuditInterceptor).
/// </summary>
public class VehicleLocation : BaseEntity
{
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    /// <summary>Anlıq sürət (km/saat).</summary>
    public double SpeedKmh { get; set; }

    /// <summary>Track daxilində sıra nömrəsi (0-dan başlayır).</summary>
    public int Sequence { get; set; }

    public DateTime RecordedAtUtc { get; set; }
}
