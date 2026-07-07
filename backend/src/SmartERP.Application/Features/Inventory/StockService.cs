using AutoMapper;
using AutoMapper.QueryableExtensions;
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
}

public class StockService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
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
            .ProjectTo<StockMovementDto>(mapper.ConfigurationProvider)
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
                    $"Kifayət qədər stok yoxdur. Mövcud: {balance}, tələb olunan: {request.Quantity}.");

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

        return await GetDtoAsync(movement.Id, ct);
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
                    $"Göndərən anbarda kifayət qədər stok yoxdur. Mövcud: {balance}.");

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
            .ProjectTo<StockMovementDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);
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
            .ProjectTo<StockMovementDto>(mapper.ConfigurationProvider)
            .FirstAsync(ct);
}
