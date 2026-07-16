namespace SmartERP.Application.Features.Transport.Gps;

/// <summary>Bir marşrut: ad + ardıcıl coğrafi keçid nöqtələri (waypoint-lər).</summary>
public record GpsRoute(string Name, (double Lat, double Lng)[] Waypoints)
{
    /// <summary>Marşrutun son məntəqəsi — "Bakı → Gəncə" üçün "Gəncə".</summary>
    public string Destination => Name.Split('→')[^1].Trim();
}

/// <summary>
/// Azərbaycan şəhərləri arası real marşrutlar — GPS simulyatoru üçün baza.
/// Koordinatlar təxminidir; simulyator waypoint-lər arasını interpolyasiya edir.
/// </summary>
public static class GpsRoutes
{
    public static readonly GpsRoute[] All =
    [
        new("Bakı → Sumqayıt", [(40.3777, 49.8920), (40.4340, 49.8080), (40.4560, 49.7550), (40.5892, 49.6689)]),
        new("Bakı → Şamaxı", [(40.3777, 49.8920), (40.5100, 49.5000), (40.6000, 49.1000), (40.6310, 48.6417)]),
        new("Bakı → Şirvan", [(40.3777, 49.8920), (40.2000, 49.4000), (40.0500, 49.1500), (39.9309, 48.9224)]),
        new("Bakı → Quba", [(40.3777, 49.8920), (40.7000, 49.4000), (41.0500, 49.0000), (41.3617, 48.5128)]),
        new("Bakı → Mingəçevir", [(40.3777, 49.8920), (40.6000, 48.8000), (40.7200, 47.9000), (40.7700, 47.0489)]),
        new("Bakı → Gəncə", [(40.3777, 49.8920), (40.6000, 48.5000), (40.6800, 47.5000), (40.6828, 46.3606)]),
    ];

    /// <summary>Marşrutların təyinat şəhərləri.</summary>
    public static readonly string[] Destinations = [.. All.Select(r => r.Destination)];

    /// <summary>
    /// Ünvana uyğun marşrutu tapır — çatdırılmanın təyinat şəhərinə görə.
    /// Tapılmasa null qaytarır.
    /// </summary>
    public static GpsRoute? ForAddress(string? address) =>
        string.IsNullOrWhiteSpace(address)
            ? null
            : All.FirstOrDefault(r => address.Contains(r.Destination, StringComparison.OrdinalIgnoreCase));

    /// <summary>Azərbaycanın təxmini mərkəzi — xəritənin başlanğıc fokusu üçün.</summary>
    public const double CenterLat = 40.5;
    public const double CenterLng = 48.5;
}
