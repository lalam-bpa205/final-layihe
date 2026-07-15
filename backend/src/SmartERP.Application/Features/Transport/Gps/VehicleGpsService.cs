using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Entities.Transport;

namespace SmartERP.Application.Features.Transport.Gps;

public interface IVehicleGpsService
{
    Task<List<VehicleLiveLocationDto>> GetLatestAsync(CancellationToken ct = default);
    Task<VehicleTrackDto> GetTrackAsync(int vehicleId, CancellationToken ct = default);
    Task<VehicleTrackDto> SimulateAsync(int vehicleId, CancellationToken ct = default);
    /// <summary>GPS izi olmayan bütün avtomobillər üçün ilkin track yaradır (startup seed).</summary>
    Task SeedMissingAsync(CancellationToken ct = default);
}

public class VehicleGpsService(IUnitOfWork unitOfWork) : IVehicleGpsService
{
    // Hər track üçün təxmini nöqtə sayı və vaxt addımı
    private const int PointsPerSegment = 12;
    private static readonly TimeSpan StepInterval = TimeSpan.FromMinutes(3);

    public async Task<List<VehicleLiveLocationDto>> GetLatestAsync(CancellationToken ct = default)
    {
        var vehicles = await unitOfWork.Repository<Vehicle>().Query()
            .Select(v => new { v.Id, v.PlateNumber, v.Brand, v.Model, v.Status })
            .ToListAsync(ct);

        var locations = await unitOfWork.Repository<VehicleLocation>().Query()
            .OrderBy(l => l.VehicleId).ThenBy(l => l.Sequence)
            .Select(l => new { l.VehicleId, l.Latitude, l.Longitude, l.SpeedKmh, l.RecordedAtUtc })
            .ToListAsync(ct);

        var byVehicle = locations.GroupBy(l => l.VehicleId).ToDictionary(g => g.Key, g => g.ToList());

        var result = new List<VehicleLiveLocationDto>();
        foreach (var v in vehicles)
        {
            if (!byVehicle.TryGetValue(v.Id, out var pts) || pts.Count == 0)
                continue;

            var last = pts[^1];
            double totalKm = 0;
            for (var i = 1; i < pts.Count; i++)
                totalKm += GeoMath.DistanceKm(pts[i - 1].Latitude, pts[i - 1].Longitude, pts[i].Latitude, pts[i].Longitude);

            result.Add(new VehicleLiveLocationDto
            {
                VehicleId = v.Id,
                PlateNumber = v.PlateNumber,
                Brand = v.Brand,
                Model = v.Model,
                Status = (int)v.Status,
                Latitude = last.Latitude,
                Longitude = last.Longitude,
                SpeedKmh = Math.Round(last.SpeedKmh, 1),
                RecordedAtUtc = last.RecordedAtUtc,
                TotalDistanceKm = Math.Round(totalKm, 1)
            });
        }
        return result;
    }

    public async Task<VehicleTrackDto> GetTrackAsync(int vehicleId, CancellationToken ct = default)
    {
        var vehicle = await unitOfWork.Repository<Vehicle>()
            .FirstOrDefaultAsync(v => v.Id == vehicleId, ct)
            ?? throw new NotFoundException("Avtomobil", vehicleId);

        var points = await unitOfWork.Repository<VehicleLocation>().Query()
            .Where(l => l.VehicleId == vehicleId)
            .OrderBy(l => l.Sequence)
            .Select(l => new GpsPointDto
            {
                Latitude = l.Latitude,
                Longitude = l.Longitude,
                SpeedKmh = Math.Round(l.SpeedKmh, 1),
                RecordedAtUtc = l.RecordedAtUtc
            })
            .ToListAsync(ct);

        double totalKm = 0;
        for (var i = 1; i < points.Count; i++)
            totalKm += GeoMath.DistanceKm(points[i - 1].Latitude, points[i - 1].Longitude, points[i].Latitude, points[i].Longitude);

        return new VehicleTrackDto
        {
            VehicleId = vehicleId,
            PlateNumber = vehicle.PlateNumber,
            Points = points,
            PointCount = points.Count,
            TotalDistanceKm = Math.Round(totalKm, 1),
            AverageSpeedKmh = points.Count > 0 ? Math.Round(points.Average(p => p.SpeedKmh), 1) : 0,
            MaxSpeedKmh = points.Count > 0 ? Math.Round(points.Max(p => p.SpeedKmh), 1) : 0,
            StartedAtUtc = points.Count > 0 ? points[0].RecordedAtUtc : null,
            EndedAtUtc = points.Count > 0 ? points[^1].RecordedAtUtc : null
        };
    }

    public async Task<VehicleTrackDto> SimulateAsync(int vehicleId, CancellationToken ct = default)
    {
        if (!await unitOfWork.Repository<Vehicle>().AnyAsync(v => v.Id == vehicleId, ct))
            throw new NotFoundException("Avtomobil", vehicleId);

        // Köhnə izi silib yenisini yazmaq — bir tranzaksiyada
        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var repo = unitOfWork.Repository<VehicleLocation>();
            var existing = await repo.ListAsync(l => l.VehicleId == vehicleId, token);
            foreach (var loc in existing)
                repo.Remove(loc);

            // Vehicle id-si seed kimi işlədilir — hər avtomobil sabit marşrut alır, sürətlər random
            var route = GpsRoutes.All[vehicleId % GpsRoutes.All.Length];
            var rnd = new Random(vehicleId * 7919 + Environment.TickCount);
            var points = GenerateTrack(route, rnd);

            for (var i = 0; i < points.Count; i++)
                await repo.AddAsync(new VehicleLocation
                {
                    VehicleId = vehicleId,
                    Latitude = points[i].Lat,
                    Longitude = points[i].Lng,
                    SpeedKmh = points[i].Speed,
                    Sequence = i,
                    RecordedAtUtc = points[i].At
                }, token);
        }, ct);

        return await GetTrackAsync(vehicleId, ct);
    }

    public async Task SeedMissingAsync(CancellationToken ct = default)
    {
        var vehicleIds = await unitOfWork.Repository<Vehicle>().Query().Select(v => v.Id).ToListAsync(ct);
        var withGps = await unitOfWork.Repository<VehicleLocation>().Query()
            .Select(l => l.VehicleId).Distinct().ToListAsync(ct);

        foreach (var id in vehicleIds.Except(withGps))
            await SimulateAsync(id, ct);
    }

    // ---------- Track generatoru ----------

    private static List<(double Lat, double Lng, double Speed, DateTime At)> GenerateTrack(GpsRoute route, Random rnd)
    {
        var points = new List<(double Lat, double Lng, double Speed, DateTime At)>();

        // Track keçmişdə başlayıb indiyə qədər davam edir
        var totalPoints = (route.Waypoints.Length - 1) * PointsPerSegment + 1;
        var at = DateTime.UtcNow - StepInterval * (totalPoints - 1);

        for (var seg = 0; seg < route.Waypoints.Length - 1; seg++)
        {
            var a = route.Waypoints[seg];
            var b = route.Waypoints[seg + 1];
            var stepsThisSeg = seg == route.Waypoints.Length - 2 ? PointsPerSegment + 1 : PointsPerSegment;

            for (var s = 0; s < stepsThisSeg; s++)
            {
                var t = (double)s / PointsPerSegment;
                // Xətti interpolyasiya + kiçik təsadüfi sapma (real yol kimi görünsün)
                var jitter = 0.008;
                var lat = a.Lat + (b.Lat - a.Lat) * t + (rnd.NextDouble() - 0.5) * jitter;
                var lng = a.Lng + (b.Lng - a.Lng) * t + (rnd.NextDouble() - 0.5) * jitter;
                var speed = 45 + rnd.NextDouble() * 65; // 45–110 km/saat

                points.Add((Math.Round(lat, 6), Math.Round(lng, 6), Math.Round(speed, 1), at));
                at += StepInterval;
            }
        }
        return points;
    }
}
