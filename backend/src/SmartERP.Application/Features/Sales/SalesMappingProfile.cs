using AutoMapper;
using SmartERP.Application.Features.Sales.Dtos;
using SmartERP.Domain.Entities.Sales;

namespace SmartERP.Application.Features.Sales;

public class SalesMappingProfile : Profile
{
    public SalesMappingProfile()
    {
        CreateMap<Customer, PartnerDto>()
            .ForMember(d => d.OrderCount, o => o.MapFrom(s => s.SalesOrders.Count));

        CreateMap<Supplier, PartnerDto>()
            .ForMember(d => d.OrderCount, o => o.MapFrom(s => s.PurchaseOrders.Count));

        CreateMap<SalesOrderItem, OrderItemDto>()
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Product.Name))
            .ForMember(d => d.Unit, o => o.MapFrom(s => s.Product.Unit));

        CreateMap<PurchaseOrderItem, OrderItemDto>()
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Product.Name))
            .ForMember(d => d.Unit, o => o.MapFrom(s => s.Product.Unit));

        CreateMap<SalesOrder, SalesOrderDto>()
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Customer.Name))
            .ForMember(d => d.WarehouseName, o => o.MapFrom(s => s.Warehouse.Name))
            .ForMember(d => d.InvoiceNumber, o => o.MapFrom(s => s.Invoice != null ? s.Invoice.Number : null));

        CreateMap<PurchaseOrder, PurchaseOrderDto>()
            .ForMember(d => d.SupplierName, o => o.MapFrom(s => s.Supplier.Name))
            .ForMember(d => d.WarehouseName, o => o.MapFrom(s => s.Warehouse.Name));
    }
}
