using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Features.Inventory;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Enums;

namespace SmartERP.Tests;

/// <summary>
/// Anbardar təyinatı: bir işçi eyni anda yalnız bir anbara cavabdeh ola bilər.
/// Qayda servis səviyyəsindədir (DB unique indeksi soft-delete ilə ziddiyyət yaradardı).
/// </summary>
public class WarehouseKeeperTests : IDisposable
{
    private readonly TestHarness _h = new();
    private readonly IWarehouseService _service;

    private int _keeperId;
    private int _otherKeeperId;
    private int _terminatedId;

    public WarehouseKeeperTests()
    {
        _service = new WarehouseService(
            _h.UnitOfWork, _h.Mapper, TestHarness.Validator<SaveWarehouseRequest>());
        Seed();
    }

    private void Seed()
    {
        var dep = new Department { Name = "Anbar" };
        _h.Db.Add(dep);
        _h.Db.SaveChanges();

        var pos = new Position { Title = "Anbardar", DepartmentId = dep.Id };
        _h.Db.Add(pos);
        _h.Db.SaveChanges();

        Employee Make(string first, string last, EmployeeStatus status) => new()
        {
            FirstName = first, LastName = last,
            Email = $"{first.ToLower()}@test.az",
            HireDate = DateOnly.FromDateTime(DateTime.Today.AddYears(-1)),
            Salary = 1500, DepartmentId = dep.Id, PositionId = pos.Id, Status = status
        };

        var keeper = Make("Sevinc", "Abbasova", EmployeeStatus.Active);
        var other = Make("Ramil", "Novruzov", EmployeeStatus.Active);
        var terminated = Make("Elvin", "Məmmədov", EmployeeStatus.Terminated);
        _h.Db.AddRange(keeper, other, terminated);
        _h.Db.SaveChanges();

        _keeperId = keeper.Id;
        _otherKeeperId = other.Id;
        _terminatedId = terminated.Id;
    }

    [Fact]
    public async Task Create_anbardarsiz_anbar_yaradila_biler()
    {
        var dto = await _service.CreateAsync(new SaveWarehouseRequest("Mərkəzi", "Bakı", null));

        dto.KeeperId.Should().BeNull();
        dto.KeeperName.Should().BeNull();
    }

    [Fact]
    public async Task Create_anbardar_teyin_edende_adini_ve_vezifesini_qaytarir()
    {
        var dto = await _service.CreateAsync(new SaveWarehouseRequest("Mərkəzi", "Bakı", _keeperId));

        dto.KeeperId.Should().Be(_keeperId);
        dto.KeeperName.Should().Be("Sevinc Abbasova");
        dto.KeeperPosition.Should().Be("Anbardar");
    }

    [Fact]
    public async Task Eyni_isci_iki_anbara_anbardar_teyin_oluna_bilmez()
    {
        await _service.CreateAsync(new SaveWarehouseRequest("Mərkəzi", "Bakı", _keeperId));

        var act = async () => await _service.CreateAsync(new SaveWarehouseRequest("Filial", "Gəncə", _keeperId));

        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*artıq 'Mərkəzi' anbarının anbardarıdır*");
        (await _h.Db.Warehouses.CountAsync()).Should().Be(1, "ikinci anbar yaranmamalıdır");
    }

    [Fact]
    public async Task Ayri_isciler_ayri_anbarlara_teyin_oluna_biler()
    {
        await _service.CreateAsync(new SaveWarehouseRequest("Mərkəzi", "Bakı", _keeperId));
        await _service.CreateAsync(new SaveWarehouseRequest("Filial", "Gəncə", _otherKeeperId));

        (await _h.Db.Warehouses.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task Update_eyni_anbarin_anbardarini_saxlamaq_konflikt_yaratmir()
    {
        var dto = await _service.CreateAsync(new SaveWarehouseRequest("Mərkəzi", "Bakı", _keeperId));

        // Yalnız ünvanı dəyişirik, anbardar eynidir — "artıq anbardardır" deməməlidir
        var updated = await _service.UpdateAsync(dto.Id, new SaveWarehouseRequest("Mərkəzi", "Bakı, Sabunçu", _keeperId));

        updated.Location.Should().Be("Bakı, Sabunçu");
        updated.KeeperId.Should().Be(_keeperId);
    }

    [Fact]
    public async Task Anbardari_bosaltmaq_ve_hemin_iscini_basqa_anbara_teyin_etmek_olar()
    {
        var first = await _service.CreateAsync(new SaveWarehouseRequest("Mərkəzi", "Bakı", _keeperId));

        await _service.UpdateAsync(first.Id, new SaveWarehouseRequest("Mərkəzi", "Bakı", null));
        var second = await _service.CreateAsync(new SaveWarehouseRequest("Filial", "Gəncə", _keeperId));

        second.KeeperId.Should().Be(_keeperId);
    }

    [Fact]
    public async Task Aktiv_olmayan_isci_anbardar_teyin_edile_bilmez()
    {
        var act = async () => await _service.CreateAsync(new SaveWarehouseRequest("Mərkəzi", "Bakı", _terminatedId));

        await act.Should().ThrowAsync<ConflictException>().WithMessage("*aktiv işçi deyil*");
    }

    [Fact]
    public async Task Movcud_olmayan_isci_anbardar_teyin_edile_bilmez()
    {
        var act = async () => await _service.CreateAsync(new SaveWarehouseRequest("Mərkəzi", "Bakı", 9999));

        await act.Should().ThrowAsync<NotFoundException>();
        (await _h.Db.Warehouses.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Stok_hereketi_olan_anbar_silinmir()
    {
        var dto = await _service.CreateAsync(new SaveWarehouseRequest("Mərkəzi", "Bakı", _keeperId));

        var category = new Category { Name = "Test" };
        _h.Db.Add(category);
        _h.Db.SaveChanges();
        var product = new Product
        {
            Name = "M", Barcode = "1", Unit = "ədəd",
            PurchasePrice = 1, SalePrice = 2, MinStockLevel = 1, CategoryId = category.Id
        };
        _h.Db.Add(product);
        _h.Db.SaveChanges();
        _h.Db.Add(new StockMovement
        {
            ProductId = product.Id, WarehouseId = dto.Id,
            Type = StockMovementType.In, Quantity = 10
        });
        _h.Db.SaveChanges();

        var act = async () => await _service.DeleteAsync(dto.Id);

        await act.Should().ThrowAsync<ConflictException>().WithMessage("*stok hərəkətləri var*");
    }

    public void Dispose() => _h.Dispose();
}
