using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Features.Transport.Gps;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;

namespace SmartERP.Tests;

/// <summary>
/// Reysə bağlı GPS izləri: hər çatdırılmanın öz marşrutu var.
/// Ən kritik incəlik — bir avtomobilin bir neçə reysi olduqda məsafə
/// hər iz daxilində hesablanmalıdır, əks halda reyslər arasındakı
/// "sıçrayış" (Gəncədə bitib Bakıdan başlaması) məsafəni şişirdər.
/// </summary>
public class DeliveryGpsTrackTests : IDisposable
{
    private readonly TestHarness _h = new();
    private readonly IVehicleGpsService _service;

    private int _vehicleId;
    private int _driverId;
    private int _deliveryA;
    private int _deliveryB;

    public DeliveryGpsTrackTests()
    {
        _service = new VehicleGpsService(_h.UnitOfWork);
        Seed();
    }

    private void Seed()
    {
        var vehicle = new Vehicle
        {
            PlateNumber = "10-AA-111", Brand = "Volvo", Model = "FH16",
            Year = 2020, Type = VehicleType.Truck, CapacityKg = 20000
        };
        var dep = new Department { Name = "Nəqliyyat" };
        _h.Db.AddRange(vehicle, dep);
        _h.Db.SaveChanges();

        var pos = new Position { Title = "Sürücü", DepartmentId = dep.Id };
        _h.Db.Add(pos);
        _h.Db.SaveChanges();

        var emp = new Employee
        {
            FirstName = "Emin", LastName = "Sultanov", Email = "e@test.az",
            HireDate = DateOnly.FromDateTime(DateTime.Today), Salary = 1500,
            DepartmentId = dep.Id, PositionId = pos.Id
        };
        _h.Db.Add(emp);
        _h.Db.SaveChanges();

        var driver = new Driver
        {
            EmployeeId = emp.Id, LicenseNumber = "AZ1", LicenseCategories = "C",
            LicenseExpiryDate = DateOnly.FromDateTime(DateTime.Today.AddYears(2))
        };
        _h.Db.Add(driver);
        _h.Db.SaveChanges();

        _vehicleId = vehicle.Id;
        _driverId = driver.Id;

        _deliveryA = AddDelivery("DLV-1", "Gəncə, Cavadxan küç. 31", DateTime.UtcNow.AddDays(-10));
        _deliveryB = AddDelivery("DLV-2", "Sumqayıt, 18-ci məhəllə", DateTime.UtcNow.AddDays(-2));
    }

    private int AddDelivery(string number, string toAddress, DateTime startedAt)
    {
        var d = new Delivery
        {
            Number = number,
            CustomerName = "Test MMC",
            FromAddress = "Bakı, Mərkəzi anbar",
            ToAddress = toAddress,
            ScheduledDate = DateOnly.FromDateTime(startedAt),
            VehicleId = _vehicleId,
            DriverId = _driverId,
            Status = DeliveryStatus.Delivered,
            StartedAtUtc = startedAt,
            DeliveredAtUtc = startedAt.AddHours(5)
        };
        _h.Db.Add(d);
        _h.Db.SaveChanges();
        return d.Id;
    }

    /// <summary>Reysin ünvanına uyğun marşrut boyunca iz yazır.</summary>
    private void AddTrack(int deliveryId, string address, DateTime start, DateTime end)
    {
        var route = GpsRoutes.ForAddress(address)!;
        var points = GpsTrackGenerator.Generate(route, new Random(1), start, end);

        for (var i = 0; i < points.Count; i++)
            _h.Db.Add(new VehicleLocation
            {
                VehicleId = _vehicleId,
                DeliveryId = deliveryId,
                Latitude = points[i].Lat,
                Longitude = points[i].Lng,
                SpeedKmh = points[i].Speed,
                Sequence = i,
                RecordedAtUtc = points[i].At
            });
        _h.Db.SaveChanges();
    }

    [Fact]
    public void GpsRoutes_unvana_gore_marsrutu_tapir()
    {
        GpsRoutes.ForAddress("Gəncə, Cavadxan küç. 31")!.Destination.Should().Be("Gəncə");
        GpsRoutes.ForAddress("Sumqayıt, 18-ci məhəllə")!.Destination.Should().Be("Sumqayıt");
        GpsRoutes.ForAddress("Naməlum şəhər").Should().BeNull();
        GpsRoutes.ForAddress(null).Should().BeNull();
    }

    [Fact]
    public async Task Catdirilmanin_oz_izi_qaytarilir_diger_reys_qarismir()
    {
        var startA = DateTime.UtcNow.AddDays(-10);
        var startB = DateTime.UtcNow.AddDays(-2);
        AddTrack(_deliveryA, "Gəncə, Cavadxan küç. 31", startA, startA.AddHours(5));
        AddTrack(_deliveryB, "Sumqayıt, 18-ci məhəllə", startB, startB.AddHours(1));

        var trackA = await _service.GetDeliveryTrackAsync(_deliveryA);
        var trackB = await _service.GetDeliveryTrackAsync(_deliveryB);

        // Bakı→Gəncə ~300 km, Bakı→Sumqayıt ~30 km
        trackA.TotalDistanceKm.Should().BeInRange(280, 330);
        trackB.TotalDistanceKm.Should().BeInRange(20, 45);
        trackA.PointCount.Should().Be(trackB.PointCount);
    }

    [Fact]
    public async Task Umumi_mesafe_reysler_arasi_sicrayisi_saymir()
    {
        var startA = DateTime.UtcNow.AddDays(-10);
        var startB = DateTime.UtcNow.AddDays(-2);
        AddTrack(_deliveryA, "Gəncə, Cavadxan küç. 31", startA, startA.AddHours(5));
        AddTrack(_deliveryB, "Sumqayıt, 18-ci məhəllə", startB, startB.AddHours(1));

        var trackA = await _service.GetDeliveryTrackAsync(_deliveryA);
        var trackB = await _service.GetDeliveryTrackAsync(_deliveryB);

        var latest = await _service.GetLatestAsync();
        var vehicle = latest.Single(v => v.VehicleId == _vehicleId);

        // Ümumi məsafə iki reysin cəmidir. Sıçrayış sayılsaydı Gəncə→Bakı
        // qayıdışı (~300 km) da əlavə olunardı.
        vehicle.TotalDistanceKm.Should().BeApproximately(
            trackA.TotalDistanceKm + trackB.TotalDistanceKm, 1.0);
    }

    [Fact]
    public async Task Avtomobilin_izi_SONUNCU_reysi_qaytarir()
    {
        var startA = DateTime.UtcNow.AddDays(-10);
        var startB = DateTime.UtcNow.AddDays(-2);
        AddTrack(_deliveryA, "Gəncə, Cavadxan küç. 31", startA, startA.AddHours(5));
        AddTrack(_deliveryB, "Sumqayıt, 18-ci məhəllə", startB, startB.AddHours(1));

        var track = await _service.GetTrackAsync(_vehicleId);

        // Sonuncu reys Sumqayıtadır (~30 km), Gəncə deyil
        track.TotalDistanceKm.Should().BeInRange(20, 45);
        track.EndedAtUtc.Should().BeCloseTo(startB.AddHours(1), TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task Simulyasiya_catdirilma_izlerine_toxunmur()
    {
        var startA = DateTime.UtcNow.AddDays(-10);
        AddTrack(_deliveryA, "Gəncə, Cavadxan küç. 31", startA, startA.AddHours(5));
        var deliveryPointsBefore = await _h.Db.VehicleLocations.CountAsync(l => l.DeliveryId == _deliveryA);

        await _service.SimulateAsync(_vehicleId);
        await _service.SimulateAsync(_vehicleId); // təkrar — cari iz əvəzlənir

        var deliveryPointsAfter = await _h.Db.VehicleLocations.CountAsync(l => l.DeliveryId == _deliveryA);
        deliveryPointsAfter.Should().Be(deliveryPointsBefore, "reysin tarixi izi silinməməlidir");

        var adHoc = await _h.Db.VehicleLocations.CountAsync(l => l.DeliveryId == null);
        adHoc.Should().BeGreaterThan(0);

        var trackA = await _service.GetDeliveryTrackAsync(_deliveryA);
        trackA.TotalDistanceKm.Should().BeInRange(280, 330, "Gəncə reysinin izi olduğu kimi qalmalıdır");
    }

    [Fact]
    public async Task Izi_olmayan_catdirilma_bos_iz_qaytarir()
    {
        var track = await _service.GetDeliveryTrackAsync(_deliveryA);

        track.PointCount.Should().Be(0);
        track.TotalDistanceKm.Should().Be(0);
        track.PlateNumber.Should().Be("10-AA-111");
    }

    [Fact]
    public async Task Movcud_olmayan_catdirilma_404_atir()
    {
        var act = async () => await _service.GetDeliveryTrackAsync(9999);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public void Generator_izi_verilen_vaxt_araligina_yayir()
    {
        var start = new DateTime(2026, 7, 1, 8, 0, 0, DateTimeKind.Utc);
        var end = start.AddHours(5);
        var route = GpsRoutes.ForAddress("Gəncə")!;

        var points = GpsTrackGenerator.Generate(route, new Random(1), start, end);

        points[0].At.Should().Be(start);
        points[^1].At.Should().BeCloseTo(end, TimeSpan.FromSeconds(1));
        points.Should().BeInAscendingOrder(p => p.At);
    }

    public void Dispose() => _h.Dispose();
}
