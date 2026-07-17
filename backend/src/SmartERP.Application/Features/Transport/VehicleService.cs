using MapsterMapper;
using Mapster;
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
    Task<VehicleDetailsDto> GetDetailsAsync(int id, CancellationToken ct = default);
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
            .ProjectToType<VehicleDto>()
            .ToListAsync(ct);
    }

    /// <summary>Avtomobilin analitik detalları: xərclər, aylıq trend və son qeydlər.</summary>
    public async Task<VehicleDetailsDto> GetDetailsAsync(int id, CancellationToken ct = default)
    {
        var vehicle = await unitOfWork.Repository<Vehicle>().Query()
            .Where(v => v.Id == id)
            .ProjectToType<VehicleDto>()
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Avtomobil", id);

        var fuelQuery = unitOfWork.Repository<FuelRecord>().Query().Where(f => f.VehicleId == id);
        var maintenanceQuery = unitOfWork.Repository<MaintenanceRecord>().Query().Where(m => m.VehicleId == id);
        var deliveryRepo = unitOfWork.Repository<Delivery>();

        var totals = new VehicleTotalsDto
        {
            FuelCost = await fuelQuery.SumAsync(f => f.Cost, ct),
            FuelLiters = await fuelQuery.SumAsync(f => f.Liters, ct),
            MaintenanceCost = await maintenanceQuery.SumAsync(m => m.Cost, ct),
            DeliveryCount = await deliveryRepo.CountAsync(d => d.VehicleId == id, ct),
            DeliveredCount = await deliveryRepo.CountAsync(
                d => d.VehicleId == id && d.Status == DeliveryStatus.Delivered, ct)
        };

        // Son 6 ay (cari daxil) — hər ay üçün nöqtə, məlumat olmasa 0
        var today = DateTime.Today;
        var firstMonth = new DateOnly(today.Year, today.Month, 1).AddMonths(-5);

        var fuelMonthly = await fuelQuery
            .Where(f => f.Date >= firstMonth)
            .GroupBy(f => new { f.Date.Year, f.Date.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Cost = g.Sum(x => x.Cost) })
            .ToListAsync(ct);

        var maintenanceMonthly = await maintenanceQuery
            .Where(m => m.Date >= firstMonth)
            .GroupBy(m => new { m.Date.Year, m.Date.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Cost = g.Sum(x => x.Cost) })
            .ToListAsync(ct);

        var monthlyCosts = Enumerable.Range(0, 6)
            .Select(i =>
            {
                var month = firstMonth.AddMonths(i);
                return new MonthlyCostDto
                {
                    Month = $"{month.Year:D4}-{month.Month:D2}",
                    FuelCost = fuelMonthly
                        .FirstOrDefault(x => x.Year == month.Year && x.Month == month.Month)?.Cost ?? 0m,
                    MaintenanceCost = maintenanceMonthly
                        .FirstOrDefault(x => x.Year == month.Year && x.Month == month.Month)?.Cost ?? 0m
                };
            })
            .ToList();

        var recentFuelRecords = await fuelQuery
            .OrderByDescending(f => f.Date).ThenByDescending(f => f.Id)
            .Take(8)
            .ProjectToType<FuelRecordDto>()
            .ToListAsync(ct);

        var recentMaintenance = await maintenanceQuery
            .OrderByDescending(m => m.Date).ThenByDescending(m => m.Id)
            .Take(8)
            .ProjectToType<MaintenanceRecordDto>()
            .ToListAsync(ct);

        var recentDeliveries = await deliveryRepo.Query()
            .Where(d => d.VehicleId == id)
            .OrderByDescending(d => d.Id)
            .Take(5)
            .ProjectToType<DeliveryDto>()
            .ToListAsync(ct);

        return new VehicleDetailsDto
        {
            Vehicle = vehicle,
            Totals = totals,
            MonthlyCosts = monthlyCosts,
            RecentFuelRecords = recentFuelRecords,
            RecentMaintenance = recentMaintenance,
            RecentDeliveries = recentDeliveries
        };
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
