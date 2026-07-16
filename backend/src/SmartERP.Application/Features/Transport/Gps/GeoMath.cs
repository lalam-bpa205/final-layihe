namespace SmartERP.Application.Features.Transport.Gps;

/// <summary>Coğrafi hesablamalar — iki nöqtə arasındakı məsafə (Haversine).</summary>
public static class GeoMath
{
    private const double EarthRadiusKm = 6371.0;

    /// <summary>İki koordinat arasındakı böyük-dairə məsafəsi (km).</summary>
    public static double DistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        return EarthRadiusKm * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    /// <summary>
    /// Ardıcıl nöqtələr üzrə qət edilmiş məsafə (km).
    /// DİQQƏT: yalnız BİR iz daxilində çağırılmalıdır. Bir avtomobilin ayrı-ayrı
    /// reyslərinin nöqtələrini birlikdə versək, reyslər arasındakı "sıçrayış"
    /// (məs. Gəncədə bitib növbəti dəfə Bakıdan başlaması) yalançı məsafə kimi
    /// sayılardı — ona görə izlər ayrıca hesablanıb sonra toplanır.
    /// </summary>
    public static double TrackDistanceKm(IReadOnlyList<(double Lat, double Lng)> orderedPoints)
    {
        double total = 0;
        for (var i = 1; i < orderedPoints.Count; i++)
            total += DistanceKm(
                orderedPoints[i - 1].Lat, orderedPoints[i - 1].Lng,
                orderedPoints[i].Lat, orderedPoints[i].Lng);
        return total;
    }

    private static double ToRad(double deg) => deg * Math.PI / 180.0;
}
