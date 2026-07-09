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

public interface ISalesOrderService
{
    Task<PagedResult<SalesOrderDto>> GetPagedAsync(OrderFilter filter, CancellationToken ct = default);
    Task<SalesOrderDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<SalesOrderDto> CreateAsync(SaveOrderRequest request, CancellationToken ct = default);
    Task<SalesOrderDto> ConfirmAsync(int id, CancellationToken ct = default);
    Task<SalesOrderDto> CancelAsync(int id, CancellationToken ct = default);
}

public class SalesOrderService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveOrderRequest> validator) : ISalesOrderService
{
    public async Task<PagedResult<SalesOrderDto>> GetPagedAsync(OrderFilter filter, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<SalesOrder>().Query();

        if (filter.Status is not null)
            query = query.Where(o => (int)o.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim();
            query = query.Where(o => o.Number.Contains(s) || o.Customer.Name.Contains(s));
        }

        return await query
            .OrderByDescending(o => o.Id)
            .ProjectTo<SalesOrderDto>(mapper.ConfigurationProvider)
            .ToPagedResultAsync(filter.Page, filter.PageSize, ct);
    }

    public async Task<SalesOrderDto> GetByIdAsync(int id, CancellationToken ct = default) =>
        await unitOfWork.Repository<SalesOrder>().Query()
            .Where(o => o.Id == id)
            .ProjectTo<SalesOrderDto>(mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Satış sifarişi", id);

    public async Task<SalesOrderDto> CreateAsync(SaveOrderRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        await EnsureRefsAsync(request, ct);

        var order = await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var newOrder = new SalesOrder
            {
                Number = "TMP",
                CustomerId = request.PartnerId,
                OrderDate = request.OrderDate,
                WarehouseId = request.WarehouseId,
                Note = request.Note,
                Items = request.Items.Select(i => new SalesOrderItem
                {
                    ProductId = i.ProductId,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = Math.Round(i.Quantity * i.UnitPrice, 2)
                }).ToList()
            };
            newOrder.TotalAmount = newOrder.Items.Sum(i => i.LineTotal);

            await unitOfWork.Repository<SalesOrder>().AddAsync(newOrder, token);
            await unitOfWork.SaveChangesAsync(token);

            newOrder.Number = $"SO-{newOrder.Id:D5}";
            return newOrder;
        }, ct);

        return await GetByIdAsync(order.Id, ct);
    }

    /// <summary>
    /// Sifarişin təsdiqi — modullararası tranzaksiya:
    /// 1) hər məhsul üçün stok yoxlanılır və çıxış hərəkəti yazılır (Anbar),
    /// 2) avtomatik faktura yaradılır (Maliyyə),
    /// 3) sifariş statusu dəyişir. Stok çatmasa HEÇ NƏ yazılmır.
    /// </summary>
    public async Task<SalesOrderDto> ConfirmAsync(int id, CancellationToken ct = default)
    {
        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var order = await unitOfWork.Repository<SalesOrder>().Query()
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.Id == id, token)
                ?? throw new NotFoundException("Satış sifarişi", id);

            if (order.Status != SalesOrderStatus.Pending)
                throw new ConflictException("Yalnız gözləyən sifariş təsdiqlənə bilər.");

            var movementRepo = unitOfWork.Repository<StockMovement>();

            // 1) Stok yoxlaması + çıxış hərəkətləri
            foreach (var item in order.Items)
            {
                var balance = await movementRepo.Query()
                    .Where(m => m.ProductId == item.ProductId && m.WarehouseId == order.WarehouseId)
                    .SumAsync(m =>
                        m.Type == StockMovementType.In || m.Type == StockMovementType.TransferIn
                            ? m.Quantity : -m.Quantity, token);

                if (balance < item.Quantity)
                    throw new ConflictException(
                        $"\"{item.Product.Name}\" üçün kifayət qədər stok yoxdur. Mövcud: {balance:0.###}, tələb olunan: {item.Quantity:0.###}.");

                await movementRepo.AddAsync(new StockMovement
                {
                    ProductId = item.ProductId,
                    WarehouseId = order.WarehouseId,
                    Type = StockMovementType.Out,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    Note = $"{order.Number} satış sifarişi"
                }, token);
            }

            // 2) Avtomatik faktura
            var invoice = new Invoice
            {
                Number = "TMP",
                CustomerName = order.Customer.Name,
                IssueDate = DateOnly.FromDateTime(DateTime.Today),
                DueDate = DateOnly.FromDateTime(DateTime.Today).AddDays(14),
                Note = $"{order.Number} satış sifarişi əsasında",
                Items = order.Items.Select(i => new InvoiceItem
                {
                    Description = i.Product.Name,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.LineTotal
                }).ToList()
            };
            invoice.TotalAmount = invoice.Items.Sum(i => i.LineTotal);

            await unitOfWork.Repository<Invoice>().AddAsync(invoice, token);
            await unitOfWork.SaveChangesAsync(token);
            invoice.Number = $"INV-{invoice.Id:D5}";

            // 3) Status
            order.Status = SalesOrderStatus.Confirmed;
            order.Invoice = invoice;
        }, ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task<SalesOrderDto> CancelAsync(int id, CancellationToken ct = default)
    {
        var order = await unitOfWork.Repository<SalesOrder>().GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Satış sifarişi", id);

        if (order.Status != SalesOrderStatus.Pending)
            throw new ConflictException("Yalnız gözləyən sifariş ləğv edilə bilər.");

        order.Status = SalesOrderStatus.Cancelled;
        await unitOfWork.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    private async Task EnsureRefsAsync(SaveOrderRequest request, CancellationToken ct)
    {
        if (!await unitOfWork.Repository<Customer>().AnyAsync(c => c.Id == request.PartnerId, ct))
            throw new NotFoundException("Müştəri", request.PartnerId);
        if (!await unitOfWork.Repository<Warehouse>().AnyAsync(w => w.Id == request.WarehouseId, ct))
            throw new NotFoundException("Anbar", request.WarehouseId);

        var productIds = request.Items.Select(i => i.ProductId).ToList();
        var existingCount = await unitOfWork.Repository<Product>()
            .CountAsync(p => productIds.Contains(p.Id), ct);
        if (existingCount != productIds.Count)
            throw new NotFoundException("Məhsul", "siyahıdakı bəzi məhsullar");
    }
}
