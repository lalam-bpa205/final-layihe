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

    /// <summary>Konkret çatdırılma zamanı qeydə alınmış GPS izi.</summary>
    Task<VehicleTrackDto> GetDeliveryTrackAsync(int deliveryId, CancellationToken ct = default);

    /// <summary>GPS izi olmayan bütün avtomobillər üçün ilkin track yaradır (startup seed).</summary>
    Task SeedMissingAsync(CancellationToken ct = default);
}

public class VehicleGpsService(IUnitOfWork unitOfWork) : IVehicleGpsService
{
    // "Cari iz" simulyasiyasının vaxt addımı
    private static readonly TimeSpan StepInterval = TimeSpan.FromMinutes(3);

    public async Task<List<VehicleLiveLocationDto>> GetLatestAsync(CancellationToken ct = default)
    {
        var vehicles = await unitOfWork.Repository<Vehicle>().Query()
            .Select(v => new { v.Id, v.PlateNumber, v.Brand, v.Model, v.Status })
            .ToListAsync(ct);

        // Vaxta görə sıralanır — bir avtomobilin bir neçə reys izi var və
        // hər izin Sequence-i 0-dan başlayır, ona görə Sequence burada yaramır
        var locations = await unitOfWork.Repository<VehicleLocation>().Query()
            .OrderBy(l => l.VehicleId).ThenBy(l => l.RecordedAtUtc)
            .Select(l => new { l.VehicleId, l.DeliveryId, l.Latitude, l.Longitude, l.SpeedKmh, l.RecordedAtUtc })
            .ToListAsync(ct);

        var byVehicle = locations.GroupBy(l => l.VehicleId).ToDictionary(g => g.Key, g => g.ToList());

        var result = new List<VehicleLiveLocationDto>();
        foreach (var v in vehicles)
        {
            if (!byVehicle.TryGetValue(v.Id, out var pts) || pts.Count == 0)
                continue;

            var last = pts[^1];

            // Məsafə hər iz (reys) daxilində hesablanıb toplanır — reyslər
            // arasındakı sıçrayış qət edilmiş məsafə sayılmamalıdır
            var totalKm = pts
                .GroupBy(p => p.DeliveryId)
                .Sum(g => GeoMath.TrackDistanceKm(
                    [.. g.OrderBy(p => p.RecordedAtUtc).Select(p => (p.Latitude, p.Longitude))]));

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

    /// <summary>
    /// Avtomobilin SONUNCU izi — reysdən-reysə ayrı izlər olduğu üçün hamısını
    /// birlikdə çəksək xəritədə reyslər arası "sıçrayış" xətləri görünərdi.
    /// Bütün reyslər üzrə ümumi məsafə <see cref="GetLatestAsync"/>-dədir.
    /// </summary>
    public async Task<VehicleTrackDto> GetTrackAsync(int vehicleId, CancellationToken ct = default)
    {
        var vehicle = await unitOfWork.Repository<Vehicle>()
            .FirstOrDefaultAsync(v => v.Id == vehicleId, ct)
            ?? throw new NotFoundException("Avtomobil", vehicleId);

        var all = await unitOfWork.Repository<VehicleLocation>().Query()
            .Where(l => l.VehicleId == vehicleId)
            .Select(l => new { l.DeliveryId, l.Latitude, l.Longitude, l.SpeedKmh, l.RecordedAtUtc })
            .ToListAsync(ct);

        var points = all
            .GroupBy(l => l.DeliveryId)
            .OrderByDescending(g => g.Max(x => x.RecordedAtUtc))
            .FirstOrDefault()
            ?.OrderBy(x => x.RecordedAtUtc)
            .Select(l => new GpsPointDto
            {
                Latitude = l.Latitude,
                Longitude = l.Longitude,
                SpeedKmh = Math.Round(l.SpeedKmh, 1),
                RecordedAtUtc = l.RecordedAtUtc
            })
            .ToList() ?? [];

        return BuildTrack(vehicleId, vehicle.PlateNumber, points);
    }

    public async Task<VehicleTrackDto> SimulateAsync(int vehicleId, CancellationToken ct = default)
    {
        if (!await unitOfWork.Repository<Vehicle>().AnyAsync(v => v.Id == vehicleId, ct))
            throw new NotFoundException("Avtomobil", vehicleId);

        // Köhnə izi silib yenisini yazmaq — bir tranzaksiyada
        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var repo = unitOfWork.Repository<VehicleLocation>();

            // YALNIZ reysə bağlı olmayan "cari iz" silinir — çatdırılmaların
            // tarixi izləri toxunulmaz qalır
            var existing = await repo.ListAsync(
                l => l.VehicleId == vehicleId && l.DeliveryId == null, token);
            foreach (var loc in existing)
                repo.Remove(loc);

            // Vehicle id-si seed kimi işlədilir — hər avtomobil sabit marşrut alır, sürətlər random
            var route = GpsRoutes.All[vehicleId % GpsRoutes.All.Length];
            var rnd = new Random(vehicleId * 7919 + Environment.TickCount);

            var end = DateTime.UtcNow;
            var start = end - StepInterval * (GpsTrackGenerator.PointCount(route) - 1);
            var points = GpsTrackGenerator.Generate(route, rnd, start, end);

            for (var i = 0; i < points.Count; i++)
                await repo.AddAsync(new VehicleLocation
                {
                    VehicleId = vehicleId,
                    DeliveryId = null,
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

    public async Task<VehicleTrackDto> GetDeliveryTrackAsync(int deliveryId, CancellationToken ct = default)
    {
        var delivery = await unitOfWork.Repository<Delivery>().Query()
            .Where(d => d.Id == deliveryId)
            .Select(d => new { d.Id, d.VehicleId, Plate = d.Vehicle.PlateNumber })
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Çatdırılma", deliveryId);

        var points = await unitOfWork.Repository<VehicleLocation>().Query()
            .Where(l => l.DeliveryId == deliveryId)
            .OrderBy(l => l.Sequence)
            .Select(l => new GpsPointDto
            {
                Latitude = l.Latitude,
                Longitude = l.Longitude,
                SpeedKmh = Math.Round(l.SpeedKmh, 1),
                RecordedAtUtc = l.RecordedAtUtc
            })
            .ToListAsync(ct);

        return BuildTrack(delivery.VehicleId, delivery.Plate, points);
    }

    /// <summary>Nöqtə siyahısından məsafə/sürət xülasəsi qurur.</summary>
    private static VehicleTrackDto BuildTrack(int vehicleId, string plate, List<GpsPointDto> points)
    {
        double totalKm = 0;
        for (var i = 1; i < points.Count; i++)
            totalKm += GeoMath.DistanceKm(
                points[i - 1].Latitude, points[i - 1].Longitude,
                points[i].Latitude, points[i].Longitude);

        return new VehicleTrackDto
        {
            VehicleId = vehicleId,
            PlateNumber = plate,
            Points = points,
            PointCount = points.Count,
            TotalDistanceKm = Math.Round(totalKm, 1),
            AverageSpeedKmh = points.Count > 0 ? Math.Round(points.Average(p => p.SpeedKmh), 1) : 0,
            MaxSpeedKmh = points.Count > 0 ? Math.Round(points.Max(p => p.SpeedKmh), 1) : 0,
            StartedAtUtc = points.Count > 0 ? points[0].RecordedAtUtc : null,
            EndedAtUtc = points.Count > 0 ? points[^1].RecordedAtUtc : null
        };
    }
}
