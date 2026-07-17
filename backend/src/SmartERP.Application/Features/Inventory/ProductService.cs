using MapsterMapper;
using Mapster;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Extensions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Inventory;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetPagedAsync(ProductFilter filter, CancellationToken ct = default);
    Task<ProductDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<ProductDto> GetByBarcodeAsync(string barcode, CancellationToken ct = default);
    Task<List<ProductDto>> GetLowStockAsync(CancellationToken ct = default);
    Task<ProductDetailsDto> GetDetailsAsync(int id, CancellationToken ct = default);
    Task<ProductDto> CreateAsync(SaveProductRequest request, CancellationToken ct = default);
    Task<ProductDto> UpdateAsync(int id, SaveProductRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class ProductService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveProductRequest> validator) : IProductService
{
    public async Task<PagedResult<ProductDto>> GetPagedAsync(ProductFilter filter, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<Product>().Query();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim();
            query = query.Where(p => p.Name.Contains(s) || p.Barcode.Contains(s));
        }

        if (filter.CategoryId is not null)
            query = query.Where(p => p.CategoryId == filter.CategoryId);

        if (filter.LowStockOnly)
            query = query.Where(p =>
                p.StockMovements.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity : -m.Quantity) <= p.MinStockLevel);

        query = (filter.SortBy?.ToLowerInvariant(), filter.SortDesc) switch
        {
            ("name", false) => query.OrderBy(p => p.Name),
            ("name", true) => query.OrderByDescending(p => p.Name),
            ("saleprice", false) => query.OrderBy(p => p.SalePrice),
            ("saleprice", true) => query.OrderByDescending(p => p.SalePrice),
            (_, true) => query.OrderByDescending(p => p.Id),
            _ => query.OrderBy(p => p.Id)
        };

        return await query
            .ProjectToType<ProductDto>()
            .ToPagedResultAsync(filter.Page, filter.PageSize, ct);
    }

    public async Task<ProductDto> GetByIdAsync(int id, CancellationToken ct = default) =>
        await ProjectedQuery().FirstOrDefaultAsync(p => p.Id == id, ct)
        ?? throw new NotFoundException("Məhsul", id);

    public async Task<ProductDto> GetByBarcodeAsync(string barcode, CancellationToken ct = default) =>
        await ProjectedQuery().FirstOrDefaultAsync(p => p.Barcode == barcode, ct)
        ?? throw new NotFoundException("Məhsul (barkod)", barcode);

    public async Task<List<ProductDto>> GetLowStockAsync(CancellationToken ct = default) =>
        await ProjectedQuery()
            .Where(p => p.CurrentStock <= p.MinStockLevel)
            .OrderBy(p => p.CurrentStock)
            .ToListAsync(ct);

    public async Task<ProductDetailsDto> GetDetailsAsync(int id, CancellationToken ct = default)
    {
        var product = await GetByIdAsync(id, ct); // yoxdursa NotFoundException atır

        var movementQuery = unitOfWork.Repository<StockMovement>().Query()
            .Where(m => m.ProductId == id);

        // Anbarlar üzrə balans (0 olmayan)
        var stockByWarehouse = (await movementQuery
                .GroupBy(m => new { m.WarehouseId, WarehouseName = m.Warehouse.Name })
                .Select(g => new ProductWarehouseStockDto
                {
                    WarehouseId = g.Key.WarehouseId,
                    WarehouseName = g.Key.WarehouseName,
                    Quantity = g.Sum(m =>
                        m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                            ? m.Quantity : -m.Quantity)
                })
                .ToListAsync(ct))
            .Where(x => x.Quantity != 0)
            .OrderBy(x => x.WarehouseName)
            .ToList();

        // Cari ayın statistikası
        var today = DateTime.Today;
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var nextMonthStart = monthStart.AddMonths(1);

        var monthMovements = await movementQuery
            .Where(m => m.CreatedDate >= monthStart && m.CreatedDate < nextMonthStart)
            .Select(m => new { m.Type, m.Quantity })
            .ToListAsync(ct);

        var monthlyStats = new ProductMonthlyStatsDto
        {
            InQty = monthMovements
                .Where(m => m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn)
                .Sum(m => m.Quantity),
            OutQty = monthMovements
                .Where(m => m.Type == StockMovementType.Out || m.Type == StockMovementType.TransferOut)
                .Sum(m => m.Quantity),
            MovementCount = monthMovements.Count
        };

        // Son 30 günün balans tarixçəsi (bütün anbarlar üzrə cəm).
        // Başlanğıc balans + günbəgün kumulyativ; hərəkətsiz günlərdə əvvəlki balans təkrarlanır.
        var historyStart = today.AddDays(-29); // bugün daxil 30 nöqtə

        var openingBalance = await movementQuery
            .Where(m => m.CreatedDate < historyStart)
            .SumAsync(m =>
                m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                    ? m.Quantity : -m.Quantity, ct);

        var dailyDeltas = (await movementQuery
                .Where(m => m.CreatedDate >= historyStart)
                .Select(m => new { m.CreatedDate, m.Type, m.Quantity })
                .ToListAsync(ct))
            .GroupBy(m => m.CreatedDate.Date)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity : -m.Quantity));

        var stockHistory = new List<StockHistoryPointDto>(30);
        var balance = openingBalance;
        for (var day = historyStart; day <= today; day = day.AddDays(1))
        {
            if (dailyDeltas.TryGetValue(day, out var delta))
                balance += delta;

            stockHistory.Add(new StockHistoryPointDto
            {
                Date = day.ToString("yyyy-MM-dd"),
                Balance = balance
            });
        }

        var recentMovements = await movementQuery
            .OrderByDescending(m => m.Id)
            .Take(10)
            .ProjectToType<StockMovementDto>()
            .ToListAsync(ct);

        return new ProductDetailsDto
        {
            Product = product,
            StockByWarehouse = stockByWarehouse,
            MonthlyStats = monthlyStats,
            StockHistory = stockHistory,
            RecentMovements = recentMovements
        };
    }

    public async Task<ProductDto> CreateAsync(SaveProductRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        await EnsureValidAsync(request, id: null, ct);

        var product = new Product
        {
            Name = request.Name,
            Barcode = request.Barcode,
            Description = request.Description,
            Unit = request.Unit,
            PurchasePrice = request.PurchasePrice,
            SalePrice = request.SalePrice,
            MinStockLevel = request.MinStockLevel,
            CategoryId = request.CategoryId
        };

        await unitOfWork.Repository<Product>().AddAsync(product, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(product.Id, ct);
    }

    public async Task<ProductDto> UpdateAsync(int id, SaveProductRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var product = await unitOfWork.Repository<Product>().GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Məhsul", id);

        await EnsureValidAsync(request, id, ct);

        product.Name = request.Name;
        product.Barcode = request.Barcode;
        product.Description = request.Description;
        product.Unit = request.Unit;
        product.PurchasePrice = request.PurchasePrice;
        product.SalePrice = request.SalePrice;
        product.MinStockLevel = request.MinStockLevel;
        product.CategoryId = request.CategoryId;

        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<Product>();
        var product = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Məhsul", id);

        if (await unitOfWork.Repository<StockMovement>().AnyAsync(m => m.ProductId == id, ct))
            throw new ConflictException("Bu məhsulun stok hərəkətləri var — silmək mümkün deyil.");

        repo.Remove(product);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private IQueryable<ProductDto> ProjectedQuery() =>
        unitOfWork.Repository<Product>().Query()
            .ProjectToType<ProductDto>();

    private async Task EnsureValidAsync(SaveProductRequest request, int? id, CancellationToken ct)
    {
        if (!await unitOfWork.Repository<Category>().AnyAsync(c => c.Id == request.CategoryId, ct))
            throw new NotFoundException("Kateqoriya", request.CategoryId);

        if (await unitOfWork.Repository<Product>()
                .AnyAsync(p => p.Barcode == request.Barcode && p.Id != id, ct))
            throw new ConflictException("Bu barkod ilə məhsul artıq mövcuddur.");
    }
}
