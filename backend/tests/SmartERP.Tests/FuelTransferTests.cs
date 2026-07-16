using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Features.Transport.Fuel;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;

namespace SmartERP.Tests;

/// <summary>
/// Yanacaq köçürməsi: anbar qalığının azalması və köçürmə qeydi bir tranzaksiyadadır.
/// </summary>
public class FuelTransferTests : IDisposable
{
    private readonly TestHarness _h = new();
    private readonly IFuelService _service;

    private int _depotId;
    private int _stationId;
    private int _vehicleId;

    public FuelTransferTests()
    {
        _service = new FuelService(
            _h.UnitOfWork, _h.Mapper,
            TestHarness.Validator<SaveFuelSourceRequest>(),
            TestHarness.Validator<FuelTransferRequest>(),
            TestHarness.Validator<ReplenishFuelSourceRequest>());
        Seed();
    }

    private void Seed()
    {
        var depot = new FuelSource
        {
            Name = "Mərkəzi anbar", Type = FuelSourceType.Depot,
            CapacityLiters = 10000, CurrentLiters = 5000, IsActive = true
        };
        var station = new FuelSource
        {
            Name = "SOCAR", Type = FuelSourceType.Station,
            CapacityLiters = 0, CurrentLiters = 0, IsActive = true
        };
        var vehicle = new Vehicle
        {
            PlateNumber = "10-AA-111", Brand = "Volvo", Model = "FH16",
            Year = 2020, Type = VehicleType.Truck, CapacityKg = 20000
        };
        _h.Db.AddRange(depot, station, vehicle);
        _h.Db.SaveChanges();

        _depotId = depot.Id;
        _stationId = station.Id;
        _vehicleId = vehicle.Id;
    }

    private FuelTransferRequest Transfer(int sourceId, decimal liters) =>
        new(sourceId, _vehicleId, null, DateOnly.FromDateTime(DateTime.Today), liters, liters * 1.3m, null, "test");

    [Fact]
    public async Task Transfer_anbardan_koçurende_qaligi_azaldir()
    {
        await _service.TransferAsync(Transfer(_depotId, 300));

        var depot = await _h.Db.FuelSources.AsNoTracking().FirstAsync(s => s.Id == _depotId);
        depot.CurrentLiters.Should().Be(4700);

        var record = await _h.Db.FuelRecords.AsNoTracking().FirstAsync();
        record.Liters.Should().Be(300);
        record.FuelSourceId.Should().Be(_depotId);
        record.VehicleId.Should().Be(_vehicleId);
    }

    [Fact]
    public async Task Transfer_xarici_menteqeden_koçurende_stok_izlenmir()
    {
        await _service.TransferAsync(Transfer(_stationId, 400));

        var station = await _h.Db.FuelSources.AsNoTracking().FirstAsync(s => s.Id == _stationId);
        station.CurrentLiters.Should().Be(0, "xarici məntəqənin stoku izlənmir, mənfiyə düşməməlidir");
        (await _h.Db.FuelRecords.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Transfer_anbarda_yanacaq_catmayanda_409_atir_ve_hec_ne_yazmir()
    {
        var act = async () => await _service.TransferAsync(Transfer(_depotId, 9999));

        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*kifayət qədər yanacaq yoxdur*");

        var depot = await _h.Db.FuelSources.AsNoTracking().FirstAsync(s => s.Id == _depotId);
        depot.CurrentLiters.Should().Be(5000, "uğursuz köçürmə qalığı dəyişməməlidir");
        (await _h.Db.FuelRecords.CountAsync()).Should().Be(0, "yarımçıq köçürmə qeydi qalmamalıdır");
    }

    [Fact]
    public async Task Transfer_deaktiv_menbeden_qadagandir()
    {
        var depot = await _h.Db.FuelSources.FirstAsync(s => s.Id == _depotId);
        depot.IsActive = false;
        await _h.Db.SaveChangesAsync();

        var act = async () => await _service.TransferAsync(Transfer(_depotId, 100));

        await act.Should().ThrowAsync<ConflictException>().WithMessage("*deaktivdir*");
        (await _h.Db.FuelRecords.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Transfer_movcud_olmayan_avtomobile_404_atir()
    {
        var request = new FuelTransferRequest(
            _depotId, 9999, null, DateOnly.FromDateTime(DateTime.Today), 100, 130, null, null);

        var act = async () => await _service.TransferAsync(request);

        await act.Should().ThrowAsync<NotFoundException>();
        (await _h.Db.FuelSources.AsNoTracking().FirstAsync(s => s.Id == _depotId))
            .CurrentLiters.Should().Be(5000);
    }

    [Fact]
    public async Task Replenish_anbara_yanacaq_elave_edir()
    {
        await _service.ReplenishAsync(_depotId, new ReplenishFuelSourceRequest(2000, "mədaxil"));

        (await _h.Db.FuelSources.AsNoTracking().FirstAsync(s => s.Id == _depotId))
            .CurrentLiters.Should().Be(7000);
    }

    [Fact]
    public async Task Replenish_tutumu_asanda_409_atir()
    {
        var act = async () => await _service.ReplenishAsync(_depotId, new ReplenishFuelSourceRequest(9000, null));

        await act.Should().ThrowAsync<ConflictException>().WithMessage("*tutumu aşılır*");
        (await _h.Db.FuelSources.AsNoTracking().FirstAsync(s => s.Id == _depotId))
            .CurrentLiters.Should().Be(5000);
    }

    [Fact]
    public async Task Replenish_xarici_menteqeye_qadagandir()
    {
        var act = async () => await _service.ReplenishAsync(_stationId, new ReplenishFuelSourceRequest(100, null));

        await act.Should().ThrowAsync<ConflictException>().WithMessage("*yalnız öz anbarımıza*");
    }

    /// <summary>Sərfiyyat GPS məsafəsinə bölünərək hesablanır.</summary>
    [Fact]
    public async Task Consumption_km_basina_sərfiyyati_GPS_mesafesine_gore_hesablayir()
    {
        // Təxminən 100 km-lik düz xətt üzrə iki GPS nöqtəsi
        _h.Db.AddRange(
            new VehicleLocation
            {
                VehicleId = _vehicleId, Latitude = 40.0, Longitude = 49.0,
                SpeedKmh = 80, Sequence = 0, RecordedAtUtc = DateTime.UtcNow.AddHours(-2)
            },
            new VehicleLocation
            {
                VehicleId = _vehicleId, Latitude = 40.898, Longitude = 49.0,
                SpeedKmh = 90, Sequence = 1, RecordedAtUtc = DateTime.UtcNow
            });
        await _h.Db.SaveChangesAsync();

        // 30 litr köçürürük → 100 km-ə 30 litr = 30 L/100km
        await _service.TransferAsync(Transfer(_stationId, 30));

        var summary = await _service.GetConsumptionAsync();
        var row = summary.Vehicles.Single(v => v.VehicleId == _vehicleId);

        row.DistanceKm.Should().BeApproximately(100, 1);
        row.LitersPer100Km.Should().BeApproximately(30, 0.5);
        row.TotalLiters.Should().Be(30);
    }

    [Fact]
    public async Task Consumption_GPS_mesafesi_yoxdursa_sifira_bolmur()
    {
        await _service.TransferAsync(Transfer(_stationId, 50));

        var summary = await _service.GetConsumptionAsync();
        var row = summary.Vehicles.Single(v => v.VehicleId == _vehicleId);

        row.DistanceKm.Should().Be(0);
        row.LitersPer100Km.Should().Be(0, "məsafə yoxdursa sərfiyyat hesablanmır");
        row.CostPerKm.Should().Be(0);
    }

    public void Dispose() => _h.Dispose();
}
