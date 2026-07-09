using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Extensions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Sales.Dtos;
using SmartERP.Domain.Entities.Finance;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Entities.Sales;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Sales;

public interface IPurchaseOrderService
{
    Task<PagedResult<PurchaseOrderDto>> GetPagedAsync(OrderFilter filter, CancellationToken ct = default);
    Task<PurchaseOrderDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<PurchaseOrderDto> CreateAsync(SaveOrderRequest request, CancellationToken ct = default);
    Task<PurchaseOrderDto> ReceiveAsync(int id, CancellationToken ct = default);
    Task<PurchaseOrderDto> CancelAsync(int id, CancellationToken ct = default);
}

public class PurchaseOrderService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveOrderRequest> validator) : IPurchaseOrderService
{
    private const string PurchaseExpenseCategoryName = "Alışlar";

    public async Task<PagedResult<PurchaseOrderDto>> GetPagedAsync(OrderFilter filter, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<PurchaseOrder>().Query();

        if (filter.Status is not null)
            query = query.Where(o => (int)o.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim();
            query = query.Where(o => o.Number.Contains(s) || o.Supplier.Name.Contains(s));
        }

        return await query
            .OrderByDescending(o => o.Id)
            .ProjectTo<PurchaseOrderDto>(mapper.ConfigurationProvider)
            .ToPagedResultAsync(filter.Page, filter.PageSize, ct);
    }

    public async Task<PurchaseOrderDto> GetByIdAsync(int id, CancellationToken ct = default) =>
        await unitOfWork.Repository<PurchaseOrder>().Query()
            .Where(o => o.Id == id)
            .ProjectTo<PurchaseOrderDto>(mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Alış sifarişi", id);

    public async Task<PurchaseOrderDto> CreateAsync(SaveOrderRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        await EnsureRefsAsync(request, ct);

        var order = await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var newOrder = new PurchaseOrder
            {
                Number = "TMP",
                SupplierId = request.PartnerId,
                OrderDate = request.OrderDate,
                WarehouseId = request.WarehouseId,
                Note = request.Note,
                Items = request.Items.Select(i => new PurchaseOrderItem
                {
                    ProductId = i.ProductId,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = Math.Round(i.Quantity * i.UnitPrice, 2)
                }).ToList()
            };
            newOrder.TotalAmount = newOrder.Items.Sum(i => i.LineTotal);

            await unitOfWork.Repository<PurchaseOrder>().AddAsync(newOrder, token);
            await unitOfWork.SaveChangesAsync(token);

            newOrder.Number = $"PO-{newOrder.Id:D5}";
            return newOrder;
        }, ct);

        return await GetByIdAsync(order.Id, ct);
    }

    /// <summary>
    /// Malın qəbulu — modullararası tranzaksiya:
    /// 1) hər məhsul üçün stok girişi (Anbar),
    /// 2) xərc əməliyyatı avtomatik yazılır (Maliyyə),
    /// 3) sifariş statusu "Qəbul edilib" olur.
    /// </summary>
    public async Task<PurchaseOrderDto> ReceiveAsync(int id, CancellationToken ct = default)
    {
        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var order = await unitOfWork.Repository<PurchaseOrder>().Query()
                .Include(o => o.Items)
                .Include(o => o.Supplier)
                .FirstOrDefaultAsync(o => o.Id == id, token)
                ?? throw new NotFoundException("Alış sifarişi", id);

            if (order.Status != PurchaseOrderStatus.Pending)
                throw new ConflictException("Yalnız gözləyən sifariş qəbul edilə bilər.");

            // 1) Stok girişləri
            var movementRepo = unitOfWork.Repository<StockMovement>();
            foreach (var item in order.Items)
            {
                await movementRepo.AddAsync(new StockMovement
                {
                    ProductId = item.ProductId,
                    WarehouseId = order.WarehouseId,
                    Type = StockMovementType.In,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    Note = $"{order.Number} alış sifarişi"
                }, token);
            }

            // 2) Xərc əməliyyatı (kateqoriya yoxdursa yaradılır)
            var categoryRepo = unitOfWork.Repository<TransactionCategory>();
            var expenseCategory = await categoryRepo.FirstOrDefaultAsync(
                c => c.Name == PurchaseExpenseCategoryName && c.Type == TransactionType.Expense, token);

            if (expenseCategory is null)
            {
                expenseCategory = new TransactionCategory
                {
                    Name = PurchaseExpenseCategoryName,
                    Type = TransactionType.Expense
                };
                await categoryRepo.AddAsync(expenseCategory, token);
            }

            await unitOfWork.Repository<FinanceTransaction>().AddAsync(new FinanceTransaction
            {
                Type = TransactionType.Expense,
                Category = expenseCategory,
                Date = DateOnly.FromDateTime(DateTime.Today),
                Amount = order.TotalAmount,
                Method = PaymentMethod.BankTransfer,
                Description = $"{order.Number} alış sifarişi — {order.Supplier.Name}"
            }, token);

            // 3) Status
            order.Status = PurchaseOrderStatus.Received;
        }, ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task<PurchaseOrderDto> CancelAsync(int id, CancellationToken ct = default)
    {
        var order = await unitOfWork.Repository<PurchaseOrder>().GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Alış sifarişi", id);

        if (order.Status != PurchaseOrderStatus.Pending)
            throw new ConflictException("Yalnız gözləyən sifariş ləğv edilə bilər.");

        order.Status = PurchaseOrderStatus.Cancelled;
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    private async Task EnsureRefsAsync(SaveOrderRequest request, CancellationToken ct)
    {
        if (!await unitOfWork.Repository<Supplier>().AnyAsync(s => s.Id == request.PartnerId, ct))
            throw new NotFoundException("Təchizatçı", request.PartnerId);
        if (!await unitOfWork.Repository<Warehouse>().AnyAsync(w => w.Id == request.WarehouseId, ct))
            throw new NotFoundException("Anbar", request.WarehouseId);

        var productIds = request.Items.Select(i => i.ProductId).ToList();
        var existingCount = await unitOfWork.Repository<Product>()
            .CountAsync(p => productIds.Contains(p.Id), ct);
        if (existingCount != productIds.Count)
            throw new NotFoundException("Məhsul", "siyahıdakı bəzi məhsullar");
    }
}
