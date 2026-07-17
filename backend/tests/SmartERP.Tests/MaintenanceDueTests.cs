using FluentAssertions;
using SmartERP.Application.Features.Transport;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;

namespace SmartERP.Tests;

/// <summary>
/// Texniki xidmət xəbərdarlığı: avtomobilin ən son planlaşdırılmış NextDueDate-inə
/// görə gecikmiş/yaxınlaşan servislərin hesablanması.
/// </summary>
public class MaintenanceDueTests : IDisposable
{
    private readonly TestHarness _h = new();
    private readonly IVehicleLogService _service;
    private readonly DateOnly _today = DateOnly.FromDateTime(DateTime.Today);

    public MaintenanceDueTests()
    {
        _service = new VehicleLogService(
            _h.UnitOfWork, _h.Mapper,
            TestHarness.Validator<SaveFuelRecordRequest>(),
            TestHarness.Validator<SaveMaintenanceRecordRequest>());
    }

    private Vehicle AddVehicle(string plate)
    {
        var v = new Vehicle
        {
            PlateNumber = plate, Brand = "Volvo", Model = "FH",
            Year = 2020, Type = VehicleType.Truck, CapacityKg = 20000
        };
        _h.Db.Add(v);
        _h.Db.SaveChanges();
        return v;
    }

    private void AddService(int vehicleId, DateOnly date, DateOnly? nextDue)
    {
        _h.Db.Add(new MaintenanceRecord
        {
            VehicleId = vehicleId, Date = date,
            Description = "Yağ dəyişimi", Cost = 100, NextDueDate = nextDue
        });
        _h.Db.SaveChanges();
    }

    [Fact]
    public async Task Gecikmish_servis_overdue_kimi_qaytarilir()
    {
        var v = AddVehicle("10-AA-111");
        AddService(v.Id, _today.AddDays(-100), _today.AddDays(-5));

        var due = await _service.GetMaintenanceDueAsync();

        due.Should().HaveCount(1);
        due[0].IsOverdue.Should().BeTrue();
        due[0].DaysUntilDue.Should().Be(-5);
        due[0].VehiclePlate.Should().Be("10-AA-111");
    }

    [Fact]
    public async Task Yaxinlashan_servis_ufuq_daxilinde_qaytarilir()
    {
        var v = AddVehicle("10-AA-222");
        AddService(v.Id, _today.AddDays(-80), _today.AddDays(10));

        var due = await _service.GetMaintenanceDueAsync(withinDays: 30);

        due.Should().HaveCount(1);
        due[0].IsOverdue.Should().BeFalse();
        due[0].DaysUntilDue.Should().Be(10);
    }

    [Fact]
    public async Task Uzaq_servis_ufuqden_kenar_qaytarilmir()
    {
        var v = AddVehicle("10-AA-333");
        AddService(v.Id, _today.AddDays(-10), _today.AddDays(120));

        var due = await _service.GetMaintenanceDueAsync(withinDays: 30);

        due.Should().BeEmpty("120 gün sonrakı servis 30 günlük üfüqdən kənardır");
    }

    [Fact]
    public async Task NextDueDate_olmayan_qeyd_nezere_alinmir()
    {
        var v = AddVehicle("10-AA-444");
        AddService(v.Id, _today.AddDays(-10), null);

        var due = await _service.GetMaintenanceDueAsync();

        due.Should().BeEmpty();
    }

    /// <summary>Bir neçə qeyd olduqda ən uzaq planlaşdırılmış tarix götürülür.</summary>
    [Fact]
    public async Task En_son_planlashdirilmish_tarix_goturulur()
    {
        var v = AddVehicle("10-AA-555");
        AddService(v.Id, _today.AddDays(-200), _today.AddDays(-150)); // köhnə, artıq keçib
        AddService(v.Id, _today.AddDays(-80), _today.AddDays(15));    // ən son plan

        var due = await _service.GetMaintenanceDueAsync();

        due.Should().HaveCount(1);
        due[0].DueDate.Should().Be(_today.AddDays(15));
        due[0].IsOverdue.Should().BeFalse("ən son plan gələcəkdədir");
    }

    [Fact]
    public async Task Son_servis_melumati_dogru_secilir()
    {
        var v = AddVehicle("10-AA-666");
        _h.Db.Add(new MaintenanceRecord
        {
            VehicleId = v.Id, Date = _today.AddDays(-90),
            Description = "Köhnə iş", Cost = 50, NextDueDate = _today.AddDays(-3)
        });
        _h.Db.Add(new MaintenanceRecord
        {
            VehicleId = v.Id, Date = _today.AddDays(-30),
            Description = "Ən son iş", Cost = 80, NextDueDate = _today.AddDays(-1)
        });
        _h.Db.SaveChanges();

        var due = await _service.GetMaintenanceDueAsync();

        due.Should().HaveCount(1);
        due[0].LastServiceDescription.Should().Be("Ən son iş");
        due[0].LastServiceDate.Should().Be(_today.AddDays(-30));
    }

    [Fact]
    public async Task Neticeler_tarixe_gore_siralanir_evvel_gecikmishler()
    {
        var v1 = AddVehicle("10-AA-777");
        var v2 = AddVehicle("10-AA-888");
        var v3 = AddVehicle("10-AA-999");
        AddService(v1.Id, _today.AddDays(-50), _today.AddDays(20));   // yaxınlaşan
        AddService(v2.Id, _today.AddDays(-50), _today.AddDays(-10));  // ən çox gecikmiş
        AddService(v3.Id, _today.AddDays(-50), _today.AddDays(5));    // yaxın

        var due = await _service.GetMaintenanceDueAsync();

        due.Select(d => d.VehiclePlate).Should()
            .ContainInOrder("10-AA-888", "10-AA-999", "10-AA-777");
    }

    public void Dispose() => _h.Dispose();
}
