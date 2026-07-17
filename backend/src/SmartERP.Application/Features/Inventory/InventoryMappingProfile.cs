using Mapster;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Inventory;

public class InventoryMappingRegister : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Category, CategoryDto>()
            .Map(d => d.ProductCount, s => s.Products.Count);

        // Anbardar soft-delete olunubsa qlobal filtr onu gizlədir → sahələr null qalır.
        config.NewConfig<Warehouse, WarehouseDto>()
            .Map(d => d.KeeperName, s => s.Keeper != null ? s.Keeper.FirstName + " " + s.Keeper.LastName : null)
            .Map(d => d.KeeperPosition, s => s.Keeper != null ? s.Keeper.Position.Title : null)
            .Map(d => d.KeeperPhone, s => s.Keeper != null ? s.Keeper.Phone : null)
            .Map(d => d.KeeperEmail, s => s.Keeper != null ? s.Keeper.Email : null);

        config.NewConfig<Product, ProductDto>()
            .Map(d => d.CategoryName, s => s.Category.Name)
            .Map(d => d.CurrentStock, s =>
                s.StockMovements.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity
                        : -m.Quantity));

        config.NewConfig<StockMovement, StockMovementDto>()
            .Map(d => d.ProductName, s => s.Product.Name)
            .Map(d => d.ProductBarcode, s => s.Product.Barcode)
            .Map(d => d.WarehouseName, s => s.Warehouse.Name);
    }
}
