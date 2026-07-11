using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Inventory;

public interface IInventorySummaryService
{
    Task<InventorySummaryDto> GetSummaryAsync(CancellationToken ct = default);
}

public class InventorySummaryService(IUnitOfWork unitOfWork, IMapper mapper) : IInventorySummaryService
{
    public async Task<InventorySummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var today = DateTime.Today;
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var nextMonthStart = monthStart.AddMonths(1);

        var productCount = await unitOfWork.Repository<Product>().CountAsync(ct: ct);
        var categoryCount = await unitOfWork.Repository<Category>().CountAsync(ct: ct);
        var warehouseCount = await unitOfWork.Repository<Warehouse>().CountAsync(ct: ct);

        var movementsThisMonth = await unitOfWork.Repository<StockMovement>()
            .CountAsync(m => m.CreatedDate >= monthStart && m.CreatedDate < nextMonthStart, ct);

        // Az stok — balans StockMovements cəmindən hesablanır (ProjectTo CurrentStock-u doldurur)
        var lowStockQuery = ProjectedProducts().Where(p => p.CurrentStock <= p.MinStockLevel);
        var lowStockCount = await lowStockQuery.CountAsync(ct);
        var lowStockProducts = await lowStockQuery
            .OrderBy(p => p.CurrentStock)
            .Take(5)
            .ToListAsync(ct);

        // Ümumi stok dəyəri — mənfi balanslı məhsul 0 sayılır (Math.Max in-memory)
        var productStocks = await unitOfWork.Repository<Product>().Query()
            .Select(p => new
            {
                p.PurchasePrice,
                Stock = p.StockMovements.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity : -m.Quantity)
            })
            .ToListAsync(ct);

        var totalStockValue = productStocks.Sum(p => Math.Max(p.Stock, 0) * p.PurchasePrice);

        // Anbar üzrə stok dəyəri (alış qiyməti ilə) — məhsul balansı anbar daxilində
        // mənfidirsə 0 sayılır, yalnız value > 0 olan anbarlar qaytarılır
        var warehouseProductBalances = await unitOfWork.Repository<StockMovement>().Query()
            .GroupBy(m => new
            {
                m.WarehouseId,
                WarehouseName = m.Warehouse.Name,
                m.ProductId,
                m.Product.PurchasePrice
            })
            .Select(g => new
            {
                g.Key.WarehouseName,
                g.Key.PurchasePrice,
                Quantity = g.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity : -m.Quantity)
            })
            .ToListAsync(ct);

        var stockByWarehouse = warehouseProductBalances
            .GroupBy(x => x.WarehouseName)
            .Select(g => new WarehouseStockValueDto
            {
                Name = g.Key,
                Value = g.Sum(x => Math.Max(x.Quantity, 0) * x.PurchasePrice)
            })
            .Where(x => x.Value > 0)
            .OrderByDescending(x => x.Value)
            .ToList();

        var categoryDistribution = await unitOfWork.Repository<Category>().Query()
            .Select(c => new CategoryDistributionDto
            {
                Name = c.Name,
                ProductCount = c.Products.Count
            })
            .OrderByDescending(c => c.ProductCount)
            .ToListAsync(ct);

        var recentMovements = await unitOfWork.Repository<StockMovement>().Query()
            .OrderByDescending(m => m.Id)
            .Take(8)
            .ProjectTo<StockMovementDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);

        return new InventorySummaryDto
        {
            ProductCount = productCount,
            CategoryCount = categoryCount,
            WarehouseCount = warehouseCount,
            LowStockCount = lowStockCount,
            TotalStockValue = totalStockValue,
            MovementsThisMonth = movementsThisMonth,
            StockByWarehouse = stockByWarehouse,
            CategoryDistribution = categoryDistribution,
            RecentMovements = recentMovements,
            LowStockProducts = lowStockProducts
        };
    }

    private IQueryable<ProductDto> ProjectedProducts() =>
        unitOfWork.Repository<Product>().Query()
            .ProjectTo<ProductDto>(mapper.ConfigurationProvider);
}
