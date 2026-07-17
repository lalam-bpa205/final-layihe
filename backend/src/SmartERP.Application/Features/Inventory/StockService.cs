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

public interface IStockService
{
    Task<PagedResult<StockMovementDto>> GetMovementsAsync(StockMovementFilter filter, CancellationToken ct = default);
    Task<List<StockLevelDto>> GetStockLevelsAsync(int? warehouseId = null, CancellationToken ct = default);
    Task<StockMovementDto> StockInAsync(StockInRequest request, CancellationToken ct = default);
    Task<StockMovementDto> StockOutAsync(StockOutRequest request, CancellationToken ct = default);
    Task<List<StockMovementDto>> TransferAsync(StockTransferRequest request, CancellationToken ct = default);

    /// <summary>Anbarlar arası köçürmə tarixçəsi — çıxış/giriş cütü tək sətir kimi.</summary>
    Task<PagedResult<StockTransferDto>> GetTransfersAsync(StockTransferFilter filter, CancellationToken ct = default);
}

public class StockService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    INotificationService notifications,
    IValidator<StockInRequest> stockInValidator,
    IValidator<StockOutRequest> stockOutValidator,
    IValidator<StockTransferRequest> transferValidator) : IStockService
{
    public async Task<PagedResult<StockMovementDto>> GetMovementsAsync(StockMovementFilter filter, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<StockMovement>().Query();

        if (filter.ProductId is not null)
            query = query.Where(m => m.ProductId == filter.ProductId);
        if (filter.WarehouseId is not null)
            query = query.Where(m => m.WarehouseId == filter.WarehouseId);
        if (filter.Type is not null)
            query = query.Where(m => m.Type == filter.Type);

        return await query
            .OrderByDescending(m => m.Id)
            .ProjectToType<StockMovementDto>()
            .ToPagedResultAsync(filter.Page, filter.PageSize, ct);
    }

    public async Task<List<StockLevelDto>> GetStockLevelsAsync(int? warehouseId = null, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<StockMovement>().Query();
        if (warehouseId is not null)
            query = query.Where(m => m.WarehouseId == warehouseId);

        return await query
            .GroupBy(m => new
            {
                m.ProductId,
                ProductName = m.Product.Name,
                m.Product.Unit,
                m.WarehouseId,
                WarehouseName = m.Warehouse.Name
            })
            .Select(g => new StockLevelDto
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.ProductName,
                Unit = g.Key.Unit,
                WarehouseId = g.Key.WarehouseId,
                WarehouseName = g.Key.WarehouseName,
                Quantity = g.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity : -m.Quantity)
            })
            .Where(x => x.Quantity != 0)
            .OrderBy(x => x.ProductName).ThenBy(x => x.WarehouseName)
            .ToListAsync(ct);
    }

    public async Task<StockMovementDto> StockInAsync(StockInRequest request, CancellationToken ct = default)
    {
        await stockInValidator.ValidateAndThrowAsync(request, ct);
        await EnsureProductAndWarehouseAsync(request.ProductId, request.WarehouseId, ct);

        var movement = new StockMovement
        {
            ProductId = request.ProductId,
            WarehouseId = request.WarehouseId,
            Type = StockMovementType.In,
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            Note = request.Note
        };

        await unitOfWork.Repository<StockMovement>().AddAsync(movement, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return await GetDtoAsync(movement.Id, ct);
    }

    public async Task<StockMovementDto> StockOutAsync(StockOutRequest request, CancellationToken ct = default)
    {
        await stockOutValidator.ValidateAndThrowAsync(request, ct);
        await EnsureProductAndWarehouseAsync(request.ProductId, request.WarehouseId, ct);

        // Çıxış + balans yoxlaması bir tranzaksiyada — paralel sorğularda
        // stokun mənfiyə düşməsinin qarşısını alır
        var movement = await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var balance = await GetBalanceAsync(request.ProductId, request.WarehouseId, token);
            if (balance < request.Quantity)
                throw new ConflictException(
                    $"Kifayət qədər stok yoxdur. Mövcud: {balance:0.##}, tələb olunan: {request.Quantity:0.##}.");

            var newMovement = new StockMovement
            {
                ProductId = request.ProductId,
                WarehouseId = request.WarehouseId,
                Type = StockMovementType.Out,
                Quantity = request.Quantity,
                Note = request.Note
            };
            await unitOfWork.Repository<StockMovement>().AddAsync(newMovement, token);
            return newMovement;
        }, ct);

        await NotifyIfLowStockAsync(request.ProductId, ct);

        return await GetDtoAsync(movement.Id, ct);
    }

    /// <summary>Ümumi qalıq minimum səviyyəyə düşübsə Anbar moduluna xəbərdarlıq göndərir.</summary>
    private async Task NotifyIfLowStockAsync(int productId, CancellationToken ct)
    {
        var product = await unitOfWork.Repository<Product>().Query()
            .Where(p => p.Id == productId)
            .Select(p => new
            {
                p.Name,
                p.MinStockLevel,
                Stock = p.StockMovements.Sum(m =>
                    m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                        ? m.Quantity : -m.Quantity)
            })
            .FirstOrDefaultAsync(ct);

        if (product is not null && product.Stock <= product.MinStockLevel)
        {
            await notifications.NotifyModuleAsync(
                AppModule.Inventory,
                "⚠️ Az stok xəbərdarlığı",
                $"\"{product.Name}\" — qalıq {product.Stock:0.###}, minimum {product.MinStockLevel:0.###}.",
                "/inventory/products", ct);
        }
    }

    public async Task<List<StockMovementDto>> TransferAsync(StockTransferRequest request, CancellationToken ct = default)
    {
        await transferValidator.ValidateAndThrowAsync(request, ct);
        await EnsureProductAndWarehouseAsync(request.ProductId, request.FromWarehouseId, ct);

        if (!await unitOfWork.Repository<Warehouse>().AnyAsync(w => w.Id == request.ToWarehouseId, ct))
            throw new NotFoundException("Anbar", request.ToWarehouseId);

        // Transfer = çıxış + giriş. İkisi bir tranzaksiyada:
        // giriş yazıla bilməsə çıxış da rollback olunur (mal "itmir").
        var groupId = Guid.NewGuid();

        var movements = await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var balance = await GetBalanceAsync(request.ProductId, request.FromWarehouseId, token);
            if (balance < request.Quantity)
                throw new ConflictException(
                    $"Göndərən anbarda kifayət qədər stok yoxdur. Mövcud: {balance:0.##}, köçürülmək istənən: {request.Quantity:0.##}.");

            var outMovement = new StockMovement
            {
                ProductId = request.ProductId,
                WarehouseId = request.FromWarehouseId,
                Type = StockMovementType.TransferOut,
                Quantity = request.Quantity,
                Note = request.Note,
                TransferGroupId = groupId
            };
            var inMovement = new StockMovement
            {
                ProductId = request.ProductId,
                WarehouseId = request.ToWarehouseId,
                Type = StockMovementType.TransferIn,
                Quantity = request.Quantity,
                Note = request.Note,
                TransferGroupId = groupId
            };

            var repo = unitOfWork.Repository<StockMovement>();
            await repo.AddAsync(outMovement, token);
            await repo.AddAsync(inMovement, token);
            return new[] { outMovement, inMovement };
        }, ct);

        var ids = movements.Select(m => m.Id).ToList();
        return await unitOfWork.Repository<StockMovement>().Query()
            .Where(m => ids.Contains(m.Id))
            .ProjectToType<StockMovementDto>()
            .ToListAsync(ct);
    }

    public async Task<PagedResult<StockTransferDto>> GetTransfersAsync(StockTransferFilter filter, CancellationToken ct = default)
    {
        // Hər köçürmə iki sətirdir (TransferOut + TransferIn) — eyni TransferGroupId ilə.
        // Çıxış sətrini əsas götürüb, cütünü giriş sətrindən tapırıq.
        var query = unitOfWork.Repository<StockMovement>().Query()
            .Where(m => m.TransferGroupId != null && m.Type == StockMovementType.TransferOut);

        if (filter.ProductId is not null)
            query = query.Where(m => m.ProductId == filter.ProductId);

        // Anbar filtri: həm göndərən, həm qəbul edən tərəf sayılır
        if (filter.WarehouseId is not null)
            query = query.Where(m =>
                m.WarehouseId == filter.WarehouseId ||
                unitOfWork.Repository<StockMovement>().Query()
                    .Any(x => x.TransferGroupId == m.TransferGroupId &&
                              x.Type == StockMovementType.TransferIn &&
                              x.WarehouseId == filter.WarehouseId));

        var transfers = query
            .OrderByDescending(m => m.Id)
            .Select(m => new StockTransferDto
            {
                TransferGroupId = m.TransferGroupId!.Value,
                ProductId = m.ProductId,
                ProductName = m.Product.Name,
                Unit = m.Product.Unit,
                FromWarehouseId = m.WarehouseId,
                FromWarehouseName = m.Warehouse.Name,
                ToWarehouseId = unitOfWork.Repository<StockMovement>().Query()
                    .Where(x => x.TransferGroupId == m.TransferGroupId &&
                                x.Type == StockMovementType.TransferIn)
                    .Select(x => x.WarehouseId).FirstOrDefault(),
                ToWarehouseName = unitOfWork.Repository<StockMovement>().Query()
                    .Where(x => x.TransferGroupId == m.TransferGroupId &&
                                x.Type == StockMovementType.TransferIn)
                    .Select(x => x.Warehouse.Name).FirstOrDefault()!,
                Quantity = m.Quantity,
                Note = m.Note,
                CreatedDate = m.CreatedDate,
                CreatedBy = m.CreatedBy
            });

        return await transfers.ToPagedResultAsync(filter.Page, filter.PageSize, ct);
    }

    // ---------- Köməkçi metodlar ----------

    private async Task<decimal> GetBalanceAsync(int productId, int warehouseId, CancellationToken ct) =>
        await unitOfWork.Repository<StockMovement>().Query()
            .Where(m => m.ProductId == productId && m.WarehouseId == warehouseId)
            .SumAsync(m =>
                m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                    ? m.Quantity : -m.Quantity, ct);

    private async Task EnsureProductAndWarehouseAsync(int productId, int warehouseId, CancellationToken ct)
    {
        if (!await unitOfWork.Repository<Product>().AnyAsync(p => p.Id == productId, ct))
            throw new NotFoundException("Məhsul", productId);
        if (!await unitOfWork.Repository<Warehouse>().AnyAsync(w => w.Id == warehouseId, ct))
            throw new NotFoundException("Anbar", warehouseId);
    }

    private async Task<StockMovementDto> GetDtoAsync(int id, CancellationToken ct) =>
        await unitOfWork.Repository<StockMovement>().Query()
            .Where(m => m.Id == id)
            .ProjectToType<StockMovementDto>()
            .FirstAsync(ct);
}
