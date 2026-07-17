using MapsterMapper;
using Mapster;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Transport;

public interface ITransportSummaryService
{
    Task<TransportSummaryDto> GetSummaryAsync(CancellationToken ct = default);
}

public class TransportSummaryService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IDriverService driverService) : ITransportSummaryService
{
    public async Task<TransportSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var today = DateTime.Today;
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var nextMonthStart = monthStart.AddMonths(1);
        var monthStartDate = DateOnly.FromDateTime(monthStart);
        var nextMonthStartDate = monthStartDate.AddMonths(1);

        // Avtomobil sayları status üzrə
        var vehicleGroups = await unitOfWork.Repository<Vehicle>().Query()
            .GroupBy(v => v.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var vehicles = new VehicleCountsDto
        {
            Total = vehicleGroups.Sum(g => g.Count),
            Active = vehicleGroups.FirstOrDefault(g => g.Status == VehicleStatus.Active)?.Count ?? 0,
            OnTrip = vehicleGroups.FirstOrDefault(g => g.Status == VehicleStatus.OnTrip)?.Count ?? 0,
            InMaintenance = vehicleGroups.FirstOrDefault(g => g.Status == VehicleStatus.InMaintenance)?.Count ?? 0,
            Inactive = vehicleGroups.FirstOrDefault(g => g.Status == VehicleStatus.Inactive)?.Count ?? 0
        };

        // Sürücü sayları status üzrə
        var driverGroups = await unitOfWork.Repository<Driver>().Query()
            .GroupBy(d => d.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var drivers = new DriverCountsDto
        {
            Total = driverGroups.Sum(g => g.Count),
            Available = driverGroups.FirstOrDefault(g => g.Status == DriverStatus.Available)?.Count ?? 0,
            OnTrip = driverGroups.FirstOrDefault(g => g.Status == DriverStatus.OnTrip)?.Count ?? 0
        };

        var activeDeliveryCount = await unitOfWork.Repository<Delivery>()
            .CountAsync(d => d.Status == DeliveryStatus.InTransit, ct);

        // Cari ayda yaradılmış çatdırılmalar
        var monthDeliveryGroups = await unitOfWork.Repository<Delivery>().Query()
            .Where(d => d.CreatedDate >= monthStart && d.CreatedDate < nextMonthStart)
            .GroupBy(d => d.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var deliveriesThisMonth = new MonthDeliveryStatsDto
        {
            Total = monthDeliveryGroups.Sum(g => g.Count),
            Delivered = monthDeliveryGroups.FirstOrDefault(g => g.Status == DeliveryStatus.Delivered)?.Count ?? 0,
            Cancelled = monthDeliveryGroups.FirstOrDefault(g => g.Status == DeliveryStatus.Cancelled)?.Count ?? 0
        };

        var monthFuelCost = await unitOfWork.Repository<FuelRecord>().Query()
            .Where(f => f.Date >= monthStartDate && f.Date < nextMonthStartDate)
            .SumAsync(f => f.Cost, ct);

        var monthMaintenanceCost = await unitOfWork.Repository<MaintenanceRecord>().Query()
            .Where(m => m.Date >= monthStartDate && m.Date < nextMonthStartDate)
            .SumAsync(m => m.Cost, ct);

        var expiringLicenses = await driverService.GetExpiringLicensesAsync(30, ct);

        // Cari ayda ən çox çatdırılma tamamlayan sürücülər (top 5)
        var topDrivers = await unitOfWork.Repository<Delivery>().Query()
            .Where(d => d.Status == DeliveryStatus.Delivered
                && d.DeliveredAtUtc >= monthStart && d.DeliveredAtUtc < nextMonthStart)
            .GroupBy(d => new
            {
                d.DriverId,
                d.Driver.Employee.FirstName,
                d.Driver.Employee.LastName
            })
            .Select(g => new TopDriverDto
            {
                DriverId = g.Key.DriverId,
                FullName = g.Key.FirstName + " " + g.Key.LastName,
                DeliveredCount = g.Count()
            })
            .OrderByDescending(x => x.DeliveredCount)
            .Take(5)
            .ToListAsync(ct);

        var recentDeliveries = await unitOfWork.Repository<Delivery>().Query()
            .OrderByDescending(d => d.Id)
            .Take(8)
            .ProjectToType<DeliveryDto>()
            .ToListAsync(ct);

        return new TransportSummaryDto
        {
            Vehicles = vehicles,
            Drivers = drivers,
            ActiveDeliveryCount = activeDeliveryCount,
            DeliveriesThisMonth = deliveriesThisMonth,
            MonthFuelCost = monthFuelCost,
            MonthMaintenanceCost = monthMaintenanceCost,
            ExpiringLicenses = expiringLicenses,
            TopDrivers = topDrivers,
            RecentDeliveries = recentDeliveries
        };
    }
}
