using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Domain.Entities.Transport;

namespace SmartERP.Application.Features.Transport;

/// <summary>Yanacaq və texniki xidmət qeydləri.</summary>
public interface IVehicleLogService
{
    Task<List<FuelRecordDto>> GetFuelRecordsAsync(int? vehicleId = null, CancellationToken ct = default);
    Task<FuelRecordDto> AddFuelRecordAsync(SaveFuelRecordRequest request, CancellationToken ct = default);
    Task<List<MaintenanceRecordDto>> GetMaintenanceRecordsAsync(int? vehicleId = null, CancellationToken ct = default);
    Task<MaintenanceRecordDto> AddMaintenanceRecordAsync(SaveMaintenanceRecordRequest request, CancellationToken ct = default);

    /// <summary>Gecikmiş və yaxınlaşan (varsayılan 30 gün) texniki xidmətlər.</summary>
    Task<List<MaintenanceDueDto>> GetMaintenanceDueAsync(int withinDays = 30, CancellationToken ct = default);
}

public class VehicleLogService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveFuelRecordRequest> fuelValidator,
    IValidator<SaveMaintenanceRecordRequest> maintenanceValidator) : IVehicleLogService
{
    public async Task<List<FuelRecordDto>> GetFuelRecordsAsync(int? vehicleId = null, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<FuelRecord>().Query();
        if (vehicleId is not null)
            query = query.Where(f => f.VehicleId == vehicleId);

        return await query
            .OrderByDescending(f => f.Date).ThenByDescending(f => f.Id)
            .ProjectTo<FuelRecordDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);
    }

    public async Task<FuelRecordDto> AddFuelRecordAsync(SaveFuelRecordRequest request, CancellationToken ct = default)
    {
        await fuelValidator.ValidateAndThrowAsync(request, ct);

        if (!await unitOfWork.Repository<Vehicle>().AnyAsync(v => v.Id == request.VehicleId, ct))
            throw new NotFoundException("Avtomobil", request.VehicleId);
        if (request.DriverId is not null &&
            !await unitOfWork.Repository<Driver>().AnyAsync(d => d.Id == request.DriverId, ct))
            throw new NotFoundException("Sürücü", request.DriverId);

        var record = new FuelRecord
        {
            VehicleId = request.VehicleId,
            DriverId = request.DriverId,
            Date = request.Date,
            Liters = request.Liters,
            Cost = request.Cost,
            OdometerKm = request.OdometerKm,
            Note = request.Note
        };

        await unitOfWork.Repository<FuelRecord>().AddAsync(record, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return await unitOfWork.Repository<FuelRecord>().Query()
            .Where(f => f.Id == record.Id)
            .ProjectTo<FuelRecordDto>(mapper.ConfigurationProvider)
            .FirstAsync(ct);
    }

    public async Task<List<MaintenanceRecordDto>> GetMaintenanceRecordsAsync(int? vehicleId = null, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<MaintenanceRecord>().Query();
        if (vehicleId is not null)
            query = query.Where(m => m.VehicleId == vehicleId);

        return await query
            .OrderByDescending(m => m.Date).ThenByDescending(m => m.Id)
            .ProjectTo<MaintenanceRecordDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);
    }

    public async Task<MaintenanceRecordDto> AddMaintenanceRecordAsync(SaveMaintenanceRecordRequest request, CancellationToken ct = default)
    {
        await maintenanceValidator.ValidateAndThrowAsync(request, ct);

        if (!await unitOfWork.Repository<Vehicle>().AnyAsync(v => v.Id == request.VehicleId, ct))
            throw new NotFoundException("Avtomobil", request.VehicleId);

        var record = new MaintenanceRecord
        {
            VehicleId = request.VehicleId,
            Date = request.Date,
            Description = request.Description,
            Cost = request.Cost,
            NextDueDate = request.NextDueDate
        };

        await unitOfWork.Repository<MaintenanceRecord>().AddAsync(record, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return await unitOfWork.Repository<MaintenanceRecord>().Query()
            .Where(m => m.Id == record.Id)
            .ProjectTo<MaintenanceRecordDto>(mapper.ConfigurationProvider)
            .FirstAsync(ct);
    }

    public async Task<List<MaintenanceDueDto>> GetMaintenanceDueAsync(int withinDays = 30, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var horizon = today.AddDays(withinDays);

        // Hər avtomobilin NextDueDate təyin olunmuş SONUNCU servis qeydini götürürük.
        // Növbəti servis tarixi cədvəldəki ən son planlaşdırılmış tarixdir.
        var records = await unitOfWork.Repository<MaintenanceRecord>().Query()
            .Where(m => m.NextDueDate != null)
            .Select(m => new
            {
                m.VehicleId,
                Plate = m.Vehicle.PlateNumber,
                m.Vehicle.Brand,
                m.Vehicle.Model,
                m.Date,
                m.Description,
                DueDate = m.NextDueDate!.Value
            })
            .ToListAsync(ct);

        return records
            .GroupBy(m => m.VehicleId)
            .Select(g =>
            {
                // Ən uzaq planlaşdırılmış tarix = avtomobilin cari "növbəti servisi"
                var next = g.OrderByDescending(x => x.DueDate).First();
                var last = g.OrderByDescending(x => x.Date).First();
                return new MaintenanceDueDto
                {
                    VehicleId = g.Key,
                    VehiclePlate = next.Plate,
                    Brand = next.Brand,
                    Model = next.Model,
                    LastServiceDate = last.Date,
                    LastServiceDescription = last.Description,
                    DueDate = next.DueDate,
                    DaysUntilDue = next.DueDate.DayNumber - today.DayNumber,
                    IsOverdue = next.DueDate < today
                };
            })
            // Yalnız gecikmiş və ya üfüqdəki servislər
            .Where(d => d.DueDate <= horizon)
            .OrderBy(d => d.DueDate)
            .ToList();
    }
}
