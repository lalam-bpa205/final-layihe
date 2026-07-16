using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Application.Features.Transport.Gps;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Transport.Fuel;

/// <summary>Yanacaq mənbələri, köçürmələr və sərfiyyat analitikası.</summary>
public interface IFuelService
{
    Task<List<FuelSourceDto>> GetSourcesAsync(CancellationToken ct = default);
    Task<FuelSourceDto> CreateSourceAsync(SaveFuelSourceRequest request, CancellationToken ct = default);
    Task<FuelSourceDto> UpdateSourceAsync(int id, SaveFuelSourceRequest request, CancellationToken ct = default);

    /// <summary>Anbara yanacaq mədaxili.</summary>
    Task<FuelSourceDto> ReplenishAsync(int id, ReplenishFuelSourceRequest request, CancellationToken ct = default);

    /// <summary>Mənbədən avtomobilə yanacaq köçürür — anbar stoku və qeyd bir tranzaksiyada.</summary>
    Task<FuelRecordDto> TransferAsync(FuelTransferRequest request, CancellationToken ct = default);

    /// <summary>GPS məsafəsinə əsasən avtomobillərin km başına yanacaq sərfiyyatı.</summary>
    Task<FuelSummaryDto> GetConsumptionAsync(CancellationToken ct = default);
}

public class FuelService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveFuelSourceRequest> sourceValidator,
    IValidator<FuelTransferRequest> transferValidator,
    IValidator<ReplenishFuelSourceRequest> replenishValidator) : IFuelService
{
    public async Task<List<FuelSourceDto>> GetSourcesAsync(CancellationToken ct = default)
    {
        var sources = await unitOfWork.Repository<FuelSource>().Query()
            .OrderBy(s => s.Type).ThenBy(s => s.Name)
            .ProjectTo<FuelSourceDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);

        // Hər mənbədən köçürülmüş ümumi həcm
        var totals = await unitOfWork.Repository<FuelRecord>().Query()
            .Where(f => f.FuelSourceId != null)
            .GroupBy(f => f.FuelSourceId!.Value)
            .Select(g => new { SourceId = g.Key, Liters = g.Sum(x => x.Liters), Count = g.Count() })
            .ToListAsync(ct);

        var map = totals.ToDictionary(t => t.SourceId);
        foreach (var s in sources)
            if (map.TryGetValue(s.Id, out var t))
            {
                s.TotalTransferredLiters = t.Liters;
                s.TransferCount = t.Count;
            }

        return sources;
    }

    public async Task<FuelSourceDto> CreateSourceAsync(SaveFuelSourceRequest request, CancellationToken ct = default)
    {
        await sourceValidator.ValidateAndThrowAsync(request, ct);

        var source = new FuelSource
        {
            Name = request.Name,
            Type = request.Type,
            Address = request.Address,
            CapacityLiters = request.CapacityLiters,
            CurrentLiters = 0,
            IsActive = true
        };

        await unitOfWork.Repository<FuelSource>().AddAsync(source, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<FuelSourceDto>(source);
    }

    public async Task<FuelSourceDto> UpdateSourceAsync(int id, SaveFuelSourceRequest request, CancellationToken ct = default)
    {
        await sourceValidator.ValidateAndThrowAsync(request, ct);

        var source = await unitOfWork.Repository<FuelSource>().FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new NotFoundException("Yanacaq mənbəyi", id);

        if (request.CapacityLiters < source.CurrentLiters)
            throw new ConflictException(
                $"Tutum cari qalıqdan ({source.CurrentLiters:0.##} L) az ola bilməz.");

        source.Name = request.Name;
        source.Type = request.Type;
        source.Address = request.Address;
        source.CapacityLiters = request.CapacityLiters;

        unitOfWork.Repository<FuelSource>().Update(source);
        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<FuelSourceDto>(source);
    }

    public async Task<FuelSourceDto> ReplenishAsync(int id, ReplenishFuelSourceRequest request, CancellationToken ct = default)
    {
        await replenishValidator.ValidateAndThrowAsync(request, ct);

        var source = await unitOfWork.Repository<FuelSource>().FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new NotFoundException("Yanacaq mənbəyi", id);

        if (source.Type != FuelSourceType.Depot)
            throw new ConflictException("Yalnız öz anbarımıza yanacaq mədaxil etmək olar.");

        if (source.CurrentLiters + request.Liters > source.CapacityLiters)
            throw new ConflictException(
                $"Anbarın tutumu aşılır. Boş yer: {source.CapacityLiters - source.CurrentLiters:0.##} L, mədaxil: {request.Liters:0.##} L.");

        source.CurrentLiters += request.Liters;
        unitOfWork.Repository<FuelSource>().Update(source);
        await unitOfWork.SaveChangesAsync(ct);

        return mapper.Map<FuelSourceDto>(source);
    }

    public async Task<FuelRecordDto> TransferAsync(FuelTransferRequest request, CancellationToken ct = default)
    {
        await transferValidator.ValidateAndThrowAsync(request, ct);

        // Anbar stokunun azalması və köçürmə qeydi atomikdir:
        // hər hansı addım xəta versə heç nə yazılmır (ROLLBACK).
        var recordId = await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var source = await unitOfWork.Repository<FuelSource>()
                .FirstOrDefaultAsync(s => s.Id == request.FuelSourceId, token)
                ?? throw new NotFoundException("Yanacaq mənbəyi", request.FuelSourceId);

            if (!source.IsActive)
                throw new ConflictException($"'{source.Name}' mənbəyi deaktivdir.");

            if (!await unitOfWork.Repository<Vehicle>().AnyAsync(v => v.Id == request.VehicleId, token))
                throw new NotFoundException("Avtomobil", request.VehicleId);

            if (request.DriverId is not null &&
                !await unitOfWork.Repository<Driver>().AnyAsync(d => d.Id == request.DriverId, token))
                throw new NotFoundException("Sürücü", request.DriverId);

            // Öz anbarımızdırsa qalıq yoxlanılır və azaldılır
            if (source.Type == FuelSourceType.Depot)
            {
                if (source.CurrentLiters < request.Liters)
                    throw new ConflictException(
                        $"'{source.Name}' anbarında kifayət qədər yanacaq yoxdur. " +
                        $"Qalıq: {source.CurrentLiters:0.##} L, tələb olunan: {request.Liters:0.##} L.");

                source.CurrentLiters -= request.Liters;
                unitOfWork.Repository<FuelSource>().Update(source);
            }

            var record = new FuelRecord
            {
                VehicleId = request.VehicleId,
                DriverId = request.DriverId,
                FuelSourceId = source.Id,
                Date = request.Date,
                Liters = request.Liters,
                Cost = request.Cost,
                OdometerKm = request.OdometerKm,
                Note = request.Note
            };

            await unitOfWork.Repository<FuelRecord>().AddAsync(record, token);
            await unitOfWork.SaveChangesAsync(token);

            return record.Id;
        }, ct);

        return await unitOfWork.Repository<FuelRecord>().Query()
            .Where(f => f.Id == recordId)
            .ProjectTo<FuelRecordDto>(mapper.ConfigurationProvider)
            .FirstAsync(ct);
    }

    public async Task<FuelSummaryDto> GetConsumptionAsync(CancellationToken ct = default)
    {
        var vehicles = await unitOfWork.Repository<Vehicle>().Query()
            .Select(v => new { v.Id, v.PlateNumber, v.Brand, v.Model })
            .ToListAsync(ct);

        var fuelTotals = await unitOfWork.Repository<FuelRecord>().Query()
            .GroupBy(f => f.VehicleId)
            .Select(g => new
            {
                VehicleId = g.Key,
                Liters = g.Sum(x => x.Liters),
                Cost = g.Sum(x => x.Cost),
                Count = g.Count()
            })
            .ToListAsync(ct);
        var fuelMap = fuelTotals.ToDictionary(f => f.VehicleId);

        var distanceMap = await GetDistanceByVehicleAsync(ct);

        var rows = new List<VehicleFuelConsumptionDto>();
        foreach (var v in vehicles)
        {
            fuelMap.TryGetValue(v.Id, out var f);
            distanceMap.TryGetValue(v.Id, out var km);

            var liters = f?.Liters ?? 0m;
            var cost = f?.Cost ?? 0m;

            rows.Add(new VehicleFuelConsumptionDto
            {
                VehicleId = v.Id,
                PlateNumber = v.PlateNumber,
                Brand = v.Brand,
                Model = v.Model,
                TotalLiters = liters,
                TotalCost = cost,
                TransferCount = f?.Count ?? 0,
                DistanceKm = Math.Round(km, 1),
                // Məsafə yoxdursa sərfiyyat hesablanmır (sıfıra bölmə)
                LitersPer100Km = km > 0 ? Math.Round((double)liters / km * 100, 2) : 0,
                LitersPerKm = km > 0 ? Math.Round((double)liters / km, 3) : 0,
                CostPerKm = km > 0 ? Math.Round(cost / (decimal)km, 3) : 0,
                AvgPricePerLiter = liters > 0 ? Math.Round(cost / liters, 3) : 0
            });
        }

        var totalLiters = rows.Sum(r => r.TotalLiters);
        var totalKm = rows.Sum(r => r.DistanceKm);

        return new FuelSummaryDto
        {
            Vehicles = [.. rows.OrderByDescending(r => r.LitersPer100Km)],
            TotalLiters = totalLiters,
            TotalCost = rows.Sum(r => r.TotalCost),
            TotalDistanceKm = Math.Round(totalKm, 1),
            FleetLitersPer100Km = totalKm > 0 ? Math.Round((double)totalLiters / totalKm * 100, 2) : 0,
            DepotLitersRemaining = await unitOfWork.Repository<FuelSource>().Query()
                .Where(s => s.Type == FuelSourceType.Depot)
                .SumAsync(s => s.CurrentLiters, ct)
        };
    }

    /// <summary>GPS nöqtələri arasındakı Haversine məsafələrinin cəmi — avtomobil üzrə.</summary>
    private async Task<Dictionary<int, double>> GetDistanceByVehicleAsync(CancellationToken ct)
    {
        var points = await unitOfWork.Repository<VehicleLocation>().Query()
            .OrderBy(l => l.VehicleId).ThenBy(l => l.Sequence)
            .Select(l => new { l.VehicleId, l.Latitude, l.Longitude })
            .ToListAsync(ct);

        return points
            .GroupBy(p => p.VehicleId)
            .ToDictionary(g => g.Key, g =>
            {
                var list = g.ToList();
                double km = 0;
                for (var i = 1; i < list.Count; i++)
                    km += GeoMath.DistanceKm(
                        list[i - 1].Latitude, list[i - 1].Longitude,
                        list[i].Latitude, list[i].Longitude);
                return km;
            });
    }
}
