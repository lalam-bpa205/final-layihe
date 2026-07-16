namespace SmartERP.Application.Features.Transport.Gps;

/// <summary>Generasiya olunmuş bir GPS nöqtəsi.</summary>
public record GpsTrackPoint(double Lat, double Lng, double Speed, DateTime At);

/// <summary>
/// Marşrut boyunca GPS izi generasiya edir — real qurğu olmadığı üçün.
/// Həm "cari iz" simulyatoru, həm də nümayiş datası eyni generatoru işlədir
/// ki, izlərin xarakteri hər yerdə eyni olsun.
/// </summary>
public static class GpsTrackGenerator
{
    /// <summary>Hər seqment (iki waypoint arası) neçə nöqtəyə bölünür.</summary>
    public const int PointsPerSegment = 12;

    /// <summary>Marşrutun ümumi nöqtə sayı.</summary>
    public static int PointCount(GpsRoute route) => (route.Waypoints.Length - 1) * PointsPerSegment + 1;

    /// <summary>
    /// Verilmiş vaxt aralığına bərabər paylanmış iz yaradır.
    /// Nöqtələr waypoint-lər arasında xətti interpolyasiya + kiçik təsadüfi
    /// sapma ilə düzülür (düz xətt süni görünməsin).
    /// </summary>
    public static List<GpsTrackPoint> Generate(GpsRoute route, Random rnd, DateTime startUtc, DateTime endUtc)
    {
        var points = new List<GpsTrackPoint>();
        var total = PointCount(route);
        var step = total > 1 ? (endUtc - startUtc) / (total - 1) : TimeSpan.Zero;
        var at = startUtc;

        for (var seg = 0; seg < route.Waypoints.Length - 1; seg++)
        {
            var a = route.Waypoints[seg];
            var b = route.Waypoints[seg + 1];

            // Sonuncu seqmentdə son waypoint-i də əlavə edirik
            var steps = seg == route.Waypoints.Length - 2 ? PointsPerSegment + 1 : PointsPerSegment;

            for (var s = 0; s < steps; s++)
            {
                var t = (double)s / PointsPerSegment;
                const double jitter = 0.008;

                var lat = a.Lat + (b.Lat - a.Lat) * t + (rnd.NextDouble() - 0.5) * jitter;
                var lng = a.Lng + (b.Lng - a.Lng) * t + (rnd.NextDouble() - 0.5) * jitter;
                var speed = 45 + rnd.NextDouble() * 65; // 45–110 km/saat

                points.Add(new GpsTrackPoint(
                    Math.Round(lat, 6), Math.Round(lng, 6), Math.Round(speed, 1), at));
                at += step;
            }
        }
        return points;
    }
}
