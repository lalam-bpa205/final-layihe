using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Features.Sales;
using SmartERP.Application.Features.Sales.Dtos;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Entities.Sales;
using SmartERP.Domain.Enums;

namespace SmartERP.Tests;

/// <summary>
/// Sifarişin təsdiqi ən mürəkkəb çoxcədvəlli əməliyyatdır:
/// stok çıxışı + faktura + status — hamısı bir tranzaksiyada.
/// Bir sətir uğursuz olarsa HEÇ NƏ yazılmamalıdır.
/// </summary>
public class SalesOrderConfirmTests : IDisposable
{
    private readonly TestHarness _h = new();
    private readonly ISalesOrderService _service;

    private int _warehouseId;
    private int _customerId;
    private int _stockedProductId;   // 50 ədəd var
    private int _emptyProductId;     // stoku yoxdur

    public SalesOrderConfirmTests()
    {
        _service = new SalesOrderService(
            _h.UnitOfWork, _h.Mapper, TestHarness.Validator<SaveOrderRequest>());
        Seed();
    }

    private void Seed()
    {
        var category = new Category { Name = "Test" };
        var warehouse = new Warehouse { Name = "Mərkəzi" };
        var customer = new Customer { Name = "Test Müştəri MMC" };
        _h.Db.AddRange(category, warehouse, customer);
        _h.Db.SaveChanges();

        var stocked = new Product
        {
            Name = "Stokda olan məhsul", Barcode = "1111111111111", Unit = "ədəd",
            PurchasePrice = 10, SalePrice = 20, MinStockLevel = 5, CategoryId = category.Id
        };
        var empty = new Product
        {
            Name = "Stokda olmayan məhsul", Barcode = "2222222222222", Unit = "ədəd",
            PurchasePrice = 30, SalePrice = 50, MinStockLevel = 5, CategoryId = category.Id
        };
        _h.Db.AddRange(stocked, empty);
        _h.Db.SaveChanges();

        _h.Db.Add(new StockMovement
        {
            ProductId = stocked.Id, WarehouseId = warehouse.Id,
            Type = StockMovementType.In, Quantity = 50
        });
        _h.Db.SaveChanges();

        _warehouseId = warehouse.Id;
        _customerId = customer.Id;
        _stockedProductId = stocked.Id;
        _emptyProductId = empty.Id;
    }

    private async Task<int> CreateOrderAsync(params OrderItemRequest[] items)
    {
        var dto = await _service.CreateAsync(new SaveOrderRequest(
            _customerId, DateOnly.FromDateTime(DateTime.Today), _warehouseId, "test", [.. items]));
        return dto.Id;
    }

    private async Task<decimal> StockAsync(int productId) =>
        await _h.Db.StockMovements
            .Where(m => m.ProductId == productId && m.WarehouseId == _warehouseId)
            .SumAsync(m => m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                ? m.Quantity : -m.Quantity);

    [Fact]
    public async Task Confirm_stoku_azaldir_faktura_yaradir_ve_statusu_deyisir()
    {
        var orderId = await CreateOrderAsync(new OrderItemRequest(_stockedProductId, 10, 20));

        await _service.ConfirmAsync(orderId);

        (await StockAsync(_stockedProductId)).Should().Be(40, "10 ədəd satıldı");

        var order = await _h.Db.SalesOrders.FirstAsync(o => o.Id == orderId);
        order.Status.Should().Be(SalesOrderStatus.Confirmed);
        order.InvoiceId.Should().NotBeNull();

        var invoice = await _h.Db.Invoices.Include(i => i.Items).FirstAsync();
        invoice.TotalAmount.Should().Be(200);
        invoice.Number.Should().StartWith("INV-");
        invoice.Items.Should().HaveCount(1);
    }

    /// <summary>
    /// Ən kritik ssenari: ikisətirli sifarişdə ikinci məhsulun stoku yoxdur.
    /// Birinci sətrin çıxışı ARTIQ yazılmışdı — rollback onu geri qaytarmalıdır.
    /// </summary>
    [Fact]
    public async Task Confirm_ikinci_setir_ugursuz_olanda_birinci_setrin_cixisi_da_geri_qayidir()
    {
        var orderId = await CreateOrderAsync(
            new OrderItemRequest(_stockedProductId, 10, 20),   // uğurlu olacaq
            new OrderItemRequest(_emptyProductId, 5, 50));     // stok yoxdur → partlayacaq

        var stockBefore = await StockAsync(_stockedProductId);
        var invoiceCountBefore = await _h.Db.Invoices.CountAsync();
        var movementCountBefore = await _h.Db.StockMovements.CountAsync();

        var act = async () => await _service.ConfirmAsync(orderId);
        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*kifayət qədər stok yoxdur*");

        // Hər şey olduğu kimi qalmalıdır
        (await StockAsync(_stockedProductId)).Should().Be(stockBefore, "birinci sətrin çıxışı rollback olunmalıdır");
        (await _h.Db.Invoices.CountAsync()).Should().Be(invoiceCountBefore, "faktura yaranmamalıdır");
        (await _h.Db.StockMovements.CountAsync()).Should().Be(movementCountBefore, "heç bir stok hərəkəti qalmamalıdır");

        var order = await _h.Db.SalesOrders.AsNoTracking().FirstAsync(o => o.Id == orderId);
        order.Status.Should().Be(SalesOrderStatus.Pending, "status dəyişməməlidir");
        order.InvoiceId.Should().BeNull();
    }

    [Fact]
    public async Task Confirm_stokdan_cox_istenende_409_atir()
    {
        var orderId = await CreateOrderAsync(new OrderItemRequest(_stockedProductId, 999, 20));

        var act = async () => await _service.ConfirmAsync(orderId);

        await act.Should().ThrowAsync<ConflictException>();
        (await StockAsync(_stockedProductId)).Should().Be(50);
    }

    [Fact]
    public async Task Confirm_ikinci_defe_cagirilanda_409_atir()
    {
        var orderId = await CreateOrderAsync(new OrderItemRequest(_stockedProductId, 5, 20));
        await _service.ConfirmAsync(orderId);

        var act = async () => await _service.ConfirmAsync(orderId);

        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*Yalnız gözləyən sifariş*");
        (await StockAsync(_stockedProductId)).Should().Be(45, "ikinci təsdiq stoku bir daha azaltmamalıdır");
        (await _h.Db.Invoices.CountAsync()).Should().Be(1, "ikinci faktura yaranmamalıdır");
    }

    [Fact]
    public async Task Confirm_ugursuz_olandan_sonra_sifaris_yenidan_tesdiqlene_biler()
    {
        var orderId = await CreateOrderAsync(
            new OrderItemRequest(_stockedProductId, 10, 20),
            new OrderItemRequest(_emptyProductId, 5, 50));

        var act = async () => await _service.ConfirmAsync(orderId);
        await act.Should().ThrowAsync<ConflictException>();

        // Çatışmayan məhsulu anbara mədaxil edirik
        _h.Db.Add(new StockMovement
        {
            ProductId = _emptyProductId, WarehouseId = _warehouseId,
            Type = StockMovementType.In, Quantity = 20
        });
        await _h.Db.SaveChangesAsync();

        // İndi təsdiq alınmalıdır — rollback sistemi "kilidləməyib"
        await _service.ConfirmAsync(orderId);

        (await StockAsync(_stockedProductId)).Should().Be(40);
        (await StockAsync(_emptyProductId)).Should().Be(15);
        (await _h.Db.SalesOrders.AsNoTracking().FirstAsync(o => o.Id == orderId))
            .Status.Should().Be(SalesOrderStatus.Confirmed);
    }

    [Fact]
    public async Task Create_sifaris_umumi_meblegi_setirlerin_cemine_beraberdir()
    {
        var orderId = await CreateOrderAsync(
            new OrderItemRequest(_stockedProductId, 3, 20),   // 60
            new OrderItemRequest(_emptyProductId, 2, 50));    // 100

        var order = await _h.Db.SalesOrders.Include(o => o.Items).FirstAsync(o => o.Id == orderId);
        order.TotalAmount.Should().Be(160);
        order.Items.Sum(i => i.LineTotal).Should().Be(order.TotalAmount);
    }

    public void Dispose() => _h.Dispose();
}
