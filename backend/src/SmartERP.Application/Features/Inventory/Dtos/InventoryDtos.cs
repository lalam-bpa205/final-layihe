using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Inventory.Dtos;

// ---------- Category ----------
public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int ProductCount { get; set; }
}

public record SaveCategoryRequest(string Name, string? Description);

// ---------- Warehouse ----------
public class WarehouseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Location { get; set; }
}

public record SaveWarehouseRequest(string Name, string? Location);

// ---------- Product ----------
public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Barcode { get; set; } = null!;
    public string? Description { get; set; }
    public string Unit { get; set; } = null!;
    public decimal PurchasePrice { get; set; }
    public decimal SalePrice { get; set; }
    public decimal MinStockLevel { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = null!;
    public decimal CurrentStock { get; set; }
    public bool IsLowStock => CurrentStock <= MinStockLevel;
}

public record SaveProductRequest(
    string Name,
    string Barcode,
    string? Description,
    string Unit,
    decimal PurchasePrice,
    decimal SalePrice,
    decimal MinStockLevel,
    int CategoryId);

public record ProductFilter(
    int Page = 1,
    int PageSize = 10,
    string? Search = null,
    int? CategoryId = null,
    bool LowStockOnly = false,
    string? SortBy = null,
    bool SortDesc = false);

// ---------- Stock ----------
public class StockMovementDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string ProductBarcode { get; set; } = null!;
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public StockMovementType Type { get; set; }
    public decimal Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? CreatedBy { get; set; }
}

public class StockLevelDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string Unit { get; set; } = null!;
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public decimal Quantity { get; set; }
}

public record StockInRequest(int ProductId, int WarehouseId, decimal Quantity, decimal? UnitPrice, string? Note);
public record StockOutRequest(int ProductId, int WarehouseId, decimal Quantity, string? Note);
public record StockTransferRequest(int ProductId, int FromWarehouseId, int ToWarehouseId, decimal Quantity, string? Note);

public record StockMovementFilter(
    int Page = 1,
    int PageSize = 10,
    int? ProductId = null,
    int? WarehouseId = null,
    StockMovementType? Type = null);

/// <summary>
/// Anbarlar arası bir köçürmə — TransferGroupId ilə bağlı çıxış/giriş cütü
/// tək sətir kimi birləşdirilir ("hardan → hara").
/// </summary>
public class StockTransferDto
{
    public Guid TransferGroupId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string Unit { get; set; } = null!;
    public int FromWarehouseId { get; set; }
    public string FromWarehouseName { get; set; } = null!;
    public int ToWarehouseId { get; set; }
    public string ToWarehouseName { get; set; } = null!;
    public decimal Quantity { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? CreatedBy { get; set; }
}

public record StockTransferFilter(
    int Page = 1,
    int PageSize = 10,
    int? ProductId = null,
    int? WarehouseId = null);

// ---------- Analitika: modul icmalı ----------
public class InventorySummaryDto
{
    public int ProductCount { get; set; }
    public int CategoryCount { get; set; }
    public int WarehouseCount { get; set; }
    public int LowStockCount { get; set; }
    public decimal TotalStockValue { get; set; }
    public int MovementsThisMonth { get; set; }
    public List<WarehouseStockValueDto> StockByWarehouse { get; set; } = [];
    public List<CategoryDistributionDto> CategoryDistribution { get; set; } = [];
    public List<StockMovementDto> RecentMovements { get; set; } = [];
    public List<ProductDto> LowStockProducts { get; set; } = [];
}

public class WarehouseStockValueDto
{
    public string Name { get; set; } = null!;
    public decimal Value { get; set; }
}

public class CategoryDistributionDto
{
    public string Name { get; set; } = null!;
    public int ProductCount { get; set; }
}

// ---------- Analitika: məhsul detalları ----------
public class ProductDetailsDto
{
    public ProductDto Product { get; set; } = null!;
    public List<ProductWarehouseStockDto> StockByWarehouse { get; set; } = [];
    public ProductMonthlyStatsDto MonthlyStats { get; set; } = null!;
    public List<StockHistoryPointDto> StockHistory { get; set; } = [];
    public List<StockMovementDto> RecentMovements { get; set; } = [];
}

public class ProductWarehouseStockDto
{
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public decimal Quantity { get; set; }
}

public class ProductMonthlyStatsDto
{
    public decimal InQty { get; set; }
    public decimal OutQty { get; set; }
    public int MovementCount { get; set; }
}

public class StockHistoryPointDto
{
    public string Date { get; set; } = null!;  // yyyy-MM-dd
    public decimal Balance { get; set; }
}
