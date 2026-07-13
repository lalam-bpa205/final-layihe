using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Sales.Dtos;

// ---------- Customer / Supplier ----------
public class PartnerDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? ContactName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public int OrderCount { get; set; }
}

public record SavePartnerRequest(
    string Name,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address);

// ---------- Orders (ümumi) ----------
public class OrderItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public string Unit { get; set; } = null!;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public record OrderItemRequest(int ProductId, decimal Quantity, decimal UnitPrice);

public record SaveOrderRequest(
    int PartnerId,
    DateOnly OrderDate,
    int WarehouseId,
    string? Note,
    List<OrderItemRequest> Items);

public record OrderFilter(
    int Page = 1,
    int PageSize = 10,
    int? Status = null,
    string? Search = null);

// ---------- SalesOrder ----------
public class SalesOrderDto
{
    public int Id { get; set; }
    public string Number { get; set; } = null!;
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = null!;
    public DateOnly OrderDate { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public SalesOrderStatus Status { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }
    public string? InvoiceNumber { get; set; }
    public List<OrderItemDto> Items { get; set; } = [];
}

// ---------- PurchaseOrder ----------
public class PurchaseOrderDto
{
    public int Id { get; set; }
    public string Number { get; set; } = null!;
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = null!;
    public DateOnly OrderDate { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public PurchaseOrderStatus Status { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }
    public List<OrderItemDto> Items { get; set; } = [];
}

// ---------- İcmal / Analitika ----------
public class OrderBucketDto
{
    public int OrderCount { get; set; }
    public decimal Amount { get; set; }
}

public class TopCustomerDto
{
    public int CustomerId { get; set; }
    public string Name { get; set; } = null!;
    public int OrderCount { get; set; }
    public decimal TotalAmount { get; set; }
}

public class SalesTrendPointDto
{
    /// <summary>Ay: "yyyy-MM"</summary>
    public string Month { get; set; } = null!;
    public decimal Sales { get; set; }
    public decimal Purchases { get; set; }
}

public class SalesOverviewDto
{
    public OrderBucketDto MonthSales { get; set; } = null!;
    public OrderBucketDto MonthPurchases { get; set; } = null!;
    public int PendingSalesCount { get; set; }
    public int PendingPurchaseCount { get; set; }
    public List<TopCustomerDto> TopCustomers { get; set; } = [];
    public List<SalesTrendPointDto> MonthlyTrend { get; set; } = [];
    public List<SalesOrderDto> RecentSalesOrders { get; set; } = [];
}

// ---------- Tərəfdaş detalları ----------
public class CustomerStatsDto
{
    public int OrderCount { get; set; }
    public int ConfirmedCount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal OutstandingAmount { get; set; }
}

public class CustomerDetailsDto
{
    public PartnerDto Customer { get; set; } = null!;
    public CustomerStatsDto Stats { get; set; } = null!;
    public List<SalesOrderDto> RecentOrders { get; set; } = [];
}

public class SupplierStatsDto
{
    public int OrderCount { get; set; }
    public int ReceivedCount { get; set; }
    public decimal TotalAmount { get; set; }
}

public class SupplierDetailsDto
{
    public PartnerDto Supplier { get; set; } = null!;
    public SupplierStatsDto Stats { get; set; } = null!;
    public List<PurchaseOrderDto> RecentOrders { get; set; } = [];
}
