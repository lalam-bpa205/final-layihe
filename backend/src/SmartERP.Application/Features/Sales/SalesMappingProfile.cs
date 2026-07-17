using Mapster;
using SmartERP.Application.Features.Sales.Dtos;
using SmartERP.Domain.Entities.Sales;

namespace SmartERP.Application.Features.Sales;

public class SalesMappingRegister : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Customer, PartnerDto>()
            .Map(d => d.OrderCount, s => s.SalesOrders.Count);

        config.NewConfig<Supplier, PartnerDto>()
            .Map(d => d.OrderCount, s => s.PurchaseOrders.Count);

        config.NewConfig<SalesOrderItem, OrderItemDto>()
            .Map(d => d.ProductName, s => s.Product.Name)
            .Map(d => d.Unit, s => s.Product.Unit);

        config.NewConfig<PurchaseOrderItem, OrderItemDto>()
            .Map(d => d.ProductName, s => s.Product.Name)
            .Map(d => d.Unit, s => s.Product.Unit);

        config.NewConfig<SalesOrder, SalesOrderDto>()
            .Map(d => d.CustomerName, s => s.Customer.Name)
            .Map(d => d.WarehouseName, s => s.Warehouse.Name)
            .Map(d => d.InvoiceNumber, s => s.Invoice != null ? s.Invoice.Number : null);

        config.NewConfig<PurchaseOrder, PurchaseOrderDto>()
            .Map(d => d.SupplierName, s => s.Supplier.Name)
            .Map(d => d.WarehouseName, s => s.Warehouse.Name);
    }
}
