using AutoMapper;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Inventory;

public class InventoryMappingProfile : Profile
{
    public InventoryMappingProfile()
    {
        CreateMap<Category, CategoryDto>()
            .ForMember(d => d.ProductCount, o => o.MapFrom(s => s.Products.Count));

        // Anbardar soft-delete olunubsa qlobal filtr onu gizlədir → sahələr null qalır.
        CreateMap<Warehouse, WarehouseDto>()
            .ForMember(d => d.KeeperName, o => o.MapFrom(s =>
                s.Keeper != null ? s.Keeper.FirstName + " " + s.Keeper.LastName : null))
            .ForMember(d => d.KeeperPosition, o => o.MapFrom(s =>
                s.Keeper != null ? s.Keeper.Position.Title : null))
            .ForMember(d => d.KeeperPhone, o => o.MapFrom(s => s.Keeper != null ? s.Keeper.Phone : null))
            .ForMember(d => d.KeeperEmail, o => o.MapFrom(s => s.Keeper != null ? s.Keeper.Email : null));

        CreateMap<Product, ProductDto>()
            .ForMember(d => d.CategoryName, o => o.MapFrom(s => s.Category.Name))
            .ForMember(d => d.CurrentStock, o => o.MapFrom(s =>
                s.StockMovements.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity
                        : -m.Quantity)));

        CreateMap<StockMovement, StockMovementDto>()
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Product.Name))
            .ForMember(d => d.ProductBarcode, o => o.MapFrom(s => s.Product.Barcode))
            .ForMember(d => d.WarehouseName, o => o.MapFrom(s => s.Warehouse.Name));
    }
}
