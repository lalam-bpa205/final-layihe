using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Transport;

public interface IVehicleService
{
    Task<List<VehicleDto>> GetAllAsync(VehicleStatus? status = null, CancellationToken ct = default);
    Task<VehicleDto> CreateAsync(SaveVehicleRequest request, CancellationToken ct = default);
    Task<VehicleDto> UpdateAsync(int id, SaveVehicleRequest request, CancellationToken ct = default);
    Task<VehicleDto> SetStatusAsync(int id, VehicleStatus status, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class VehicleService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveVehicleRequest> validator) : IVehicleService
{
    public async Task<List<VehicleDto>> GetAllAsync(VehicleStatus? status = null, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<Vehicle>().Query();
        if (status is not null)
            query = query.Where(v => v.Status == status);

        return await query
            .OrderBy(v => v.PlateNumber)
            .ProjectTo<VehicleDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);
    }

    public async Task<VehicleDto> CreateAsync(SaveVehicleRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Vehicle>();
        if (await repo.AnyAsync(v => v.PlateNumber == request.PlateNumber, ct))
            throw new ConflictException("Bu dövlət nömrəsi ilə avtomobil artıq mövcuddur.");

        var vehicle = new Vehicle
        {
            PlateNumber = request.PlateNumber,
            Brand = request.Brand,
            Model = request.Model,
            Year = request.Year,
            Type = request.Type,
            CapacityKg = request.CapacityKg
        };

        await repo.AddAsync(vehicle, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VehicleDto>(vehicle);
    }

    public async Task<VehicleDto> UpdateAsync(int id, SaveVehicleRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Vehicle>();
        var vehicle = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Avtomobil", id);

        if (await repo.AnyAsync(v => v.PlateNumber == request.PlateNumber && v.Id != id, ct))
            throw new ConflictException("Bu dövlət nömrəsi ilə avtomobil artıq mövcuddur.");

        vehicle.PlateNumber = request.PlateNumber;
        vehicle.Brand = request.Brand;
        vehicle.Model = request.Model;
        vehicle.Year = request.Year;
        vehicle.Type = request.Type;
        vehicle.CapacityKg = request.CapacityKg;

        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VehicleDto>(vehicle);
    }

    public async Task<VehicleDto> SetStatusAsync(int id, VehicleStatus status, CancellationToken ct = default)
    {
        var vehicle = await unitOfWork.Repository<Vehicle>().GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Avtomobil", id);

        if (vehicle.Status == VehicleStatus.OnTrip)
            throw new ConflictException("Səfərdə olan avtomobilin statusu dəyişdirilə bilməz — əvvəlcə çatdırılmanı tamamlayın.");

        if (status == VehicleStatus.OnTrip)
            throw new ConflictException("\"Səfərdə\" statusu yalnız çatdırılma başladılanda təyin olunur.");

        vehicle.Status = status;
        await unitOfWork.SaveChangesAsync(ct);
        return mapper.Map<VehicleDto>(vehicle);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<Vehicle>();
        var vehicle = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Avtomobil", id);

        if (await unitOfWork.Repository<Delivery>().AnyAsync(d => d.VehicleId == id, ct))
            throw new ConflictException("Bu avtomobilin çatdırılma tarixçəsi var — silmək əvəzinə deaktiv edin.");

        repo.Remove(vehicle);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
