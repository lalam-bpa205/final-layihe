using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Inventory.Dtos;
using SmartERP.Domain.Entities.Inventory;

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

        var warehouse = new Warehouse { Name = request.Name, Location = request.Location };
        await repo.AddAsync(warehouse, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<WarehouseDto>(warehouse);
    }

    public async Task<WarehouseDto> UpdateAsync(int id, SaveWarehouseRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Warehouse>();
        var warehouse = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Anbar", id);

        if (await repo.AnyAsync(w => w.Name == request.Name && w.Id != id, ct))
            throw new ConflictException("Bu adda anbar artıq mövcuddur.");

        warehouse.Name = request.Name;
        warehouse.Location = request.Location;
        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<WarehouseDto>(warehouse);
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
}
