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

    private static double ToRad(double deg) => deg * Math.PI / 180.0;
}
