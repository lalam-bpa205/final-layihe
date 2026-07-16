using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Features.Inventory;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Enums;

namespace SmartERP.Tests;

/// <summary>
/// Anbarlar arası köçürmə: çıxış + giriş bir tranzaksiyadadır.
/// Ən vacib zəmanət — mal nə "itməli", nə də "yoxdan yaranmalıdır".
/// </summary>
public class StockTransferTests : IDisposable
{
    private readonly TestHarness _h = new();
    private readonly IStockService _service;

    private int _productId;
    private int _fromWarehouseId;
    private int _toWarehouseId;

    public StockTransferTests()
    {
        _service = new StockService(
            _h.UnitOfWork,
            _h.Mapper,
            new TestHarness.FakeNotifications(),
            TestHarness.Validator<StockInRequest>(),
            TestHarness.Validator<StockOutRequest>(),
            TestHarness.Validator<StockTransferRequest>());

        Seed();
    }

    private void Seed()
    {
        var category = new Category { Name = "Test" };
        var from = new Warehouse { Name = "Mərkəzi" };
        var to = new Warehouse { Name = "Filial" };
        _h.Db.AddRange(category, from, to);
        _h.Db.SaveChanges();

        var product = new Product
        {
            Name = "Test məhsul",
            Barcode = "1111111111111",
            Unit = "ədəd",
            PurchasePrice = 10,
            SalePrice = 15,
            MinStockLevel = 5,
            CategoryId = category.Id
        };
        _h.Db.Add(product);
        _h.Db.SaveChanges();

        // Göndərən anbara 100 ədəd giriş
        _h.Db.Add(new StockMovement
        {
            ProductId = product.Id,
            WarehouseId = from.Id,
            Type = StockMovementType.In,
            Quantity = 100
        });
        _h.Db.SaveChanges();

        _productId = product.Id;
        _fromWarehouseId = from.Id;
        _toWarehouseId = to.Id;
    }

    private async Task<decimal> BalanceAsync(int warehouseId) =>
        await _h.Db.StockMovements
            .Where(m => m.ProductId == _productId && m.WarehouseId == warehouseId)
            .SumAsync(m => m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                ? m.Quantity : -m.Quantity);

    [Fact]
    public async Task Transfer_koçurulen_miqdari_bir_anbardan_digerine_kecirir()
    {
        await _service.TransferAsync(new StockTransferRequest(_productId, _fromWarehouseId, _toWarehouseId, 30, "test"));

        (await BalanceAsync(_fromWarehouseId)).Should().Be(70);
        (await BalanceAsync(_toWarehouseId)).Should().Be(30);
    }

    [Fact]
    public async Task Transfer_umumi_miqdari_deyismir_mal_yoxdan_yaranmir()
    {
        var totalBefore = await BalanceAsync(_fromWarehouseId) + await BalanceAsync(_toWarehouseId);

        await _service.TransferAsync(new StockTransferRequest(_productId, _fromWarehouseId, _toWarehouseId, 40, null));

        var totalAfter = await BalanceAsync(_fromWarehouseId) + await BalanceAsync(_toWarehouseId);
        totalAfter.Should().Be(totalBefore, "transfer malı yerini dəyişir, yaratmır və silmir");
    }

    [Fact]
    public async Task Transfer_ciftlesdirme_ucun_eyni_TransferGroupId_yazir()
    {
        await _service.TransferAsync(new StockTransferRequest(_productId, _fromWarehouseId, _toWarehouseId, 10, null));

        var transferMovements = await _h.Db.StockMovements
            .Where(m => m.TransferGroupId != null).ToListAsync();

        transferMovements.Should().HaveCount(2);
        transferMovements.Select(m => m.TransferGroupId).Distinct().Should().HaveCount(1);
        transferMovements.Select(m => m.Type)
            .Should().BeEquivalentTo([StockMovementType.TransferOut, StockMovementType.TransferIn]);
    }

    [Fact]
    public async Task Transfer_stok_catmayanda_409_atir_ve_hec_ne_yazmir()
    {
        var act = async () => await _service.TransferAsync(
            new StockTransferRequest(_productId, _fromWarehouseId, _toWarehouseId, 500, null));

        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*kifayət qədər stok yoxdur*");

        // ROLLBACK: nə çıxış, nə giriş yazılmalıdır
        (await BalanceAsync(_fromWarehouseId)).Should().Be(100, "uğursuz transfer stoku dəyişməməlidir");
        (await BalanceAsync(_toWarehouseId)).Should().Be(0);
        (await _h.Db.StockMovements.CountAsync(m => m.TransferGroupId != null))
            .Should().Be(0, "yarımçıq transfer sətri qalmamalıdır");
    }

    [Fact]
    public async Task Transfer_xeta_mesaji_reqemi_duzgun_formatlayir()
    {
        // Regressiya: əvvəllər decimal 100 az-AZ kulturasında "100,000" kimi
        // çıxırdı və istifadəçi bunu "yüz min" kimi oxuyurdu.
        var act = async () => await _service.TransferAsync(
            new StockTransferRequest(_productId, _fromWarehouseId, _toWarehouseId, 500, null));

        var ex = await act.Should().ThrowAsync<ConflictException>();
        ex.Which.Message.Should().Contain("Mövcud: 100").And.NotContain("100,000");
    }

    [Fact]
    public async Task Transfer_movcud_olmayan_anbara_404_atir()
    {
        var act = async () => await _service.TransferAsync(
            new StockTransferRequest(_productId, _fromWarehouseId, 9999, 10, null));

        await act.Should().ThrowAsync<NotFoundException>();
        (await BalanceAsync(_fromWarehouseId)).Should().Be(100);
    }

    [Fact]
    public async Task StockOut_stok_catmayanda_qaligi_menfiye_salmir()
    {
        var act = async () => await _service.StockOutAsync(
            new StockOutRequest(_productId, _fromWarehouseId, 250, null));

        await act.Should().ThrowAsync<ConflictException>();
        (await BalanceAsync(_fromWarehouseId)).Should().Be(100);
    }

    [Fact]
    public async Task StockOut_ugurlu_halda_qaligi_azaldir()
    {
        await _service.StockOutAsync(new StockOutRequest(_productId, _fromWarehouseId, 25, "satış"));

        (await BalanceAsync(_fromWarehouseId)).Should().Be(75);
    }

    public void Dispose() => _h.Dispose();
}
