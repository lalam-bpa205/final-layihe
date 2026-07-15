namespace SmartERP.Application.Features.Transport.Gps;

/// <summary>Xəritə markeri — avtomobilin son GPS mövqeyi.</summary>
public class VehicleLiveLocationDto
{
    public int VehicleId { get; set; }
    public string PlateNumber { get; set; } = null!;
    public string Brand { get; set; } = null!;
    public string Model { get; set; } = null!;
    public int Status { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double SpeedKmh { get; set; }
    public DateTime RecordedAtUtc { get; set; }
    /// <summary>Bu avtomobilin GPS izinin ümumi uzunluğu (km).</summary>
    public double TotalDistanceKm { get; set; }
}

public class GpsPointDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double SpeedKmh { get; set; }
    public DateTime RecordedAtUtc { get; set; }
}

/// <summary>Bir avtomobilin tam GPS izi + xülasə göstəriciləri.</summary>
public class VehicleTrackDto
{
    public int VehicleId { get; set; }
    public string PlateNumber { get; set; } = null!;
    public List<GpsPointDto> Points { get; set; } = [];
    public double TotalDistanceKm { get; set; }
    public double AverageSpeedKmh { get; set; }
    public double MaxSpeedKmh { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? EndedAtUtc { get; set; }
    public int PointCount { get; set; }
}
