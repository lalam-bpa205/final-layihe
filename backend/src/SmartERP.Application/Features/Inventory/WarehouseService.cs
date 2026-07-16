using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Entities.Inventory;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Inventory;

public interface IWarehouseService
{
    Task<List<WarehouseDto>> GetAllAsync(CancellationToken ct = default);
    Task<WarehouseDto> CreateAsync(SaveWarehouseRequest request, CancellationToken ct = default);
    Task<WarehouseDto> UpdateAsync(int id, SaveWarehouseRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class WarehouseService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveWarehouseRequest> validator) : IWarehouseService
{
    public async Task<List<WarehouseDto>> GetAllAsync(CancellationToken ct = default) =>
        await unitOfWork.Repository<Warehouse>().Query()
            .OrderBy(w => w.Name)
            .ProjectTo<WarehouseDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);

    public async Task<WarehouseDto> CreateAsync(SaveWarehouseRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Warehouse>();
        if (await repo.AnyAsync(w => w.Name == request.Name, ct))
            throw new ConflictException("Bu adda anbar artıq mövcuddur.");

        await EnsureKeeperAssignableAsync(request.KeeperId, null, ct);

        var warehouse = new Warehouse
        {
            Name = request.Name,
            Location = request.Location,
            KeeperId = request.KeeperId
        };
        await repo.AddAsync(warehouse, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return await GetDtoAsync(warehouse.Id, ct);
    }

    public async Task<WarehouseDto> UpdateAsync(int id, SaveWarehouseRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Warehouse>();
        var warehouse = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Anbar", id);

        if (await repo.AnyAsync(w => w.Name == request.Name && w.Id != id, ct))
            throw new ConflictException("Bu adda anbar artıq mövcuddur.");

        await EnsureKeeperAssignableAsync(request.KeeperId, id, ct);

        warehouse.Name = request.Name;
        warehouse.Location = request.Location;
        warehouse.KeeperId = request.KeeperId;
        await unitOfWork.SaveChangesAsync(ct);

        return await GetDtoAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<Warehouse>();
        var warehouse = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Anbar", id);

        if (await unitOfWork.Repository<StockMovement>().AnyAsync(m => m.WarehouseId == id, ct))
            throw new ConflictException("Bu anbarda stok hərəkətləri var — silmək mümkün deyil.");

        repo.Remove(warehouse);
        await unitOfWork.SaveChangesAsync(ct);
    }

    // ---------- Köməkçi metodlar ----------

    private async Task<WarehouseDto> GetDtoAsync(int id, CancellationToken ct) =>
        await unitOfWork.Repository<Warehouse>().Query()
            .Where(w => w.Id == id)
            .ProjectTo<WarehouseDto>(mapper.ConfigurationProvider)
            .FirstAsync(ct);

    /// <summary>
    /// Anbardar mövcud işçi olmalı və eyni anda yalnız bir anbara cavabdeh ola bilər —
    /// məsuliyyət bölgüsü aydın qalsın deyə.
    /// </summary>
    private async Task EnsureKeeperAssignableAsync(int? keeperId, int? warehouseId, CancellationToken ct)
    {
        if (keeperId is null) return;

        var employee = await unitOfWork.Repository<Employee>()
            .FirstOrDefaultAsync(e => e.Id == keeperId, ct)
            ?? throw new NotFoundException("İşçi", keeperId);

        if (employee.Status != EmployeeStatus.Active)
            throw new ConflictException(
                $"{employee.FirstName} {employee.LastName} aktiv işçi deyil — anbardar təyin edilə bilməz.");

        var other = await unitOfWork.Repository<Warehouse>().Query()
            .Where(w => w.KeeperId == keeperId && (warehouseId == null || w.Id != warehouseId))
            .Select(w => w.Name)
            .FirstOrDefaultAsync(ct);

        if (other is not null)
            throw new ConflictException(
                $"{employee.FirstName} {employee.LastName} artıq '{other}' anbarının anbardarıdır. " +
                "Bir işçi eyni anda yalnız bir anbara cavabdeh ola bilər.");
    }
}
