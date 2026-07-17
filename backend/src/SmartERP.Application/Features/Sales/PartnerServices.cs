using MapsterMapper;
using Mapster;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Sales.Dtos;
using SmartERP.Domain.Entities.Sales;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Sales;

public interface ICustomerService
{
    Task<List<PartnerDto>> GetAllAsync(string? search = null, CancellationToken ct = default);
    Task<CustomerDetailsDto> GetDetailsAsync(int id, CancellationToken ct = default);
    Task<PartnerDto> CreateAsync(SavePartnerRequest request, CancellationToken ct = default);
    Task<PartnerDto> UpdateAsync(int id, SavePartnerRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class CustomerService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SavePartnerRequest> validator) : ICustomerService
{
    public async Task<List<PartnerDto>> GetAllAsync(string? search = null, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<Customer>().Query();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.Name.Contains(search.Trim()));

        return await query
            .OrderBy(c => c.Name)
            .ProjectToType<PartnerDto>()
            .ToListAsync(ct);
    }

    public async Task<CustomerDetailsDto> GetDetailsAsync(int id, CancellationToken ct = default)
    {
        var customer = await unitOfWork.Repository<Customer>().Query()
            .Where(c => c.Id == id)
            .ProjectToType<PartnerDto>()
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Müştəri", id);

        var orderQuery = unitOfWork.Repository<SalesOrder>().Query()
            .Where(o => o.CustomerId == id);

        var orderCount = await orderQuery.CountAsync(ct);
        var confirmedCount = await orderQuery
            .CountAsync(o => o.Status == SalesOrderStatus.Confirmed, ct);
        var totalAmount = await orderQuery
            .Where(o => o.Status == SalesOrderStatus.Confirmed)
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0;

        // Təsdiqlənmiş sifarişlərə bağlı fakturaların qalıq borcu (ləğv edilmişlər xaric)
        var outstandingAmount = await orderQuery
            .Where(o => o.Status == SalesOrderStatus.Confirmed
                && o.Invoice != null && o.Invoice.Status != InvoiceStatus.Cancelled)
            .Select(o => o.Invoice!.TotalAmount
                - (o.Invoice!.Payments.Sum(p => (decimal?)p.Amount) ?? 0))
            .SumAsync(x => (decimal?)x, ct) ?? 0;

        var recentOrders = await orderQuery
            .OrderByDescending(o => o.Id)
            .Take(10)
            .ProjectToType<SalesOrderDto>()
            .ToListAsync(ct);

        return new CustomerDetailsDto
        {
            Customer = customer,
            Stats = new CustomerStatsDto
            {
                OrderCount = orderCount,
                ConfirmedCount = confirmedCount,
                TotalAmount = totalAmount,
                OutstandingAmount = outstandingAmount
            },
            RecentOrders = recentOrders
        };
    }

    public async Task<PartnerDto> CreateAsync(SavePartnerRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Customer>();
        if (await repo.AnyAsync(c => c.Name == request.Name, ct))
            throw new ConflictException("Bu adda müştəri artıq mövcuddur.");

        var customer = new Customer
        {
            Name = request.Name,
            ContactName = request.ContactName,
            Phone = request.Phone,
            Email = request.Email,
            Address = request.Address
        };
        await repo.AddAsync(customer, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<PartnerDto>(customer);
    }

    public async Task<PartnerDto> UpdateAsync(int id, SavePartnerRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Customer>();
        var customer = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Müştəri", id);

        if (await repo.AnyAsync(c => c.Name == request.Name && c.Id != id, ct))
            throw new ConflictException("Bu adda müştəri artıq mövcuddur.");

        customer.Name = request.Name;
        customer.ContactName = request.ContactName;
        customer.Phone = request.Phone;
        customer.Email = request.Email;
        customer.Address = request.Address;
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<PartnerDto>(customer);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<Customer>();
        var customer = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Müştəri", id);

        if (await unitOfWork.Repository<SalesOrder>().AnyAsync(o => o.CustomerId == id, ct))
            throw new ConflictException("Bu müştərinin sifarişləri var — silmək mümkün deyil.");

        repo.Remove(customer);
        await unitOfWork.SaveChangesAsync(ct);
    }
}

public interface ISupplierService
{
    Task<List<PartnerDto>> GetAllAsync(string? search = null, CancellationToken ct = default);
    Task<SupplierDetailsDto> GetDetailsAsync(int id, CancellationToken ct = default);
    Task<PartnerDto> CreateAsync(SavePartnerRequest request, CancellationToken ct = default);
    Task<PartnerDto> UpdateAsync(int id, SavePartnerRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class SupplierService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SavePartnerRequest> validator) : ISupplierService
{
    public async Task<List<PartnerDto>> GetAllAsync(string? search = null, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<Supplier>().Query();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.Name.Contains(search.Trim()));

        return await query
            .OrderBy(s => s.Name)
            .ProjectToType<PartnerDto>()
            .ToListAsync(ct);
    }

    public async Task<SupplierDetailsDto> GetDetailsAsync(int id, CancellationToken ct = default)
    {
        var supplier = await unitOfWork.Repository<Supplier>().Query()
            .Where(s => s.Id == id)
            .ProjectToType<PartnerDto>()
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Təchizatçı", id);

        var orderQuery = unitOfWork.Repository<PurchaseOrder>().Query()
            .Where(o => o.SupplierId == id);

        var orderCount = await orderQuery.CountAsync(ct);
        var receivedCount = await orderQuery
            .CountAsync(o => o.Status == PurchaseOrderStatus.Received, ct);
        var totalAmount = await orderQuery
            .Where(o => o.Status == PurchaseOrderStatus.Received)
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0;

        var recentOrders = await orderQuery
            .OrderByDescending(o => o.Id)
            .Take(10)
            .ProjectToType<PurchaseOrderDto>()
            .ToListAsync(ct);

        return new SupplierDetailsDto
        {
            Supplier = supplier,
            Stats = new SupplierStatsDto
            {
                OrderCount = orderCount,
                ReceivedCount = receivedCount,
                TotalAmount = totalAmount
            },
            RecentOrders = recentOrders
        };
    }

    public async Task<PartnerDto> CreateAsync(SavePartnerRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Supplier>();
        if (await repo.AnyAsync(s => s.Name == request.Name, ct))
            throw new ConflictException("Bu adda təchizatçı artıq mövcuddur.");

        var supplier = new Supplier
        {
            Name = request.Name,
            ContactName = request.ContactName,
            Phone = request.Phone,
            Email = request.Email,
            Address = request.Address
        };
        await repo.AddAsync(supplier, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<PartnerDto>(supplier);
    }

    public async Task<PartnerDto> UpdateAsync(int id, SavePartnerRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Supplier>();
        var supplier = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Təchizatçı", id);

        if (await repo.AnyAsync(s => s.Name == request.Name && s.Id != id, ct))
            throw new ConflictException("Bu adda təchizatçı artıq mövcuddur.");

        supplier.Name = request.Name;
        supplier.ContactName = request.ContactName;
        supplier.Phone = request.Phone;
        supplier.Email = request.Email;
        supplier.Address = request.Address;
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<PartnerDto>(supplier);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<Supplier>();
        var supplier = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Təchizatçı", id);

        if (await unitOfWork.Repository<PurchaseOrder>().AnyAsync(o => o.SupplierId == id, ct))
            throw new ConflictException("Bu təchizatçının sifarişləri var — silmək mümkün deyil.");

        repo.Remove(supplier);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
