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
