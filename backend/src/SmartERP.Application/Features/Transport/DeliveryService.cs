using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Extensions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Transport;

public interface IDeliveryService
{
    Task<PagedResult<DeliveryDto>> GetPagedAsync(DeliveryFilter filter, CancellationToken ct = default);
    Task<DeliveryDto> CreateAsync(SaveDeliveryRequest request, CancellationToken ct = default);
    Task<DeliveryDto> StartAsync(int id, CancellationToken ct = default);
    Task<DeliveryDto> CompleteAsync(int id, CancellationToken ct = default);
    Task<DeliveryDto> CancelAsync(int id, CancellationToken ct = default);
}

public class DeliveryService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    INotificationService notifications,
    IValidator<SaveDeliveryRequest> validator) : IDeliveryService
{
    public async Task<PagedResult<DeliveryDto>> GetPagedAsync(DeliveryFilter filter, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<Delivery>().Query();

        if (filter.Status is not null)
            query = query.Where(d => d.Status == filter.Status);
        if (filter.VehicleId is not null)
            query = query.Where(d => d.VehicleId == filter.VehicleId);
        if (filter.DriverId is not null)
            query = query.Where(d => d.DriverId == filter.DriverId);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim();
            query = query.Where(d =>
                d.Number.Contains(s) || d.CustomerName.Contains(s) || d.ToAddress.Contains(s));
        }

        return await query
            .OrderByDescending(d => d.Id)
            .ProjectTo<DeliveryDto>(mapper.ConfigurationProvider)
            .ToPagedResultAsync(filter.Page, filter.PageSize, ct);
    }

    public async Task<DeliveryDto> CreateAsync(SaveDeliveryRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var vehicle = await unitOfWork.Repository<Vehicle>().GetByIdAsync(request.VehicleId, ct)
            ?? throw new NotFoundException("Avtomobil", request.VehicleId);
        if (vehicle.Status == VehicleStatus.Inactive || vehicle.Status == VehicleStatus.InMaintenance)
            throw new ConflictException("Bu avtomobil hazırda istifadəyə yararlı deyil.");

        var driver = await unitOfWork.Repository<Driver>().GetByIdAsync(request.DriverId, ct)
            ?? throw new NotFoundException("Sürücü", request.DriverId);
        if (driver.Status == DriverStatus.Inactive)
            throw new ConflictException("Bu sürücü deaktivdir.");
        if (driver.LicenseExpiryDate <= DateOnly.FromDateTime(DateTime.Today))
            throw new ConflictException("Sürücünün vəsiqəsinin müddəti bitib — çatdırılma təyin edilə bilməz.");

        // Yük tutumu yoxlanışı
        if (request.CargoWeightKg is not null && request.CargoWeightKg > vehicle.CapacityKg)
            throw new ConflictException(
                $"Yük ({request.CargoWeightKg} kq) avtomobilin tutumunu ({vehicle.CapacityKg} kq) aşır.");

        // Sənəd nömrəsi Id əsasında verilir — Id isə yalnız INSERT-dən sonra bəlli olur.
        // İki addım (insert + nömrə) bir tranzaksiyada icra edilir.
        var delivery = await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var newDelivery = new Delivery
            {
                Number = "TMP",
                CustomerName = request.CustomerName,
                FromAddress = request.FromAddress,
                ToAddress = request.ToAddress,
                ScheduledDate = request.ScheduledDate,
                VehicleId = request.VehicleId,
                DriverId = request.DriverId,
                CargoDescription = request.CargoDescription,
                CargoWeightKg = request.CargoWeightKg,
                Note = request.Note
            };

            await unitOfWork.Repository<Delivery>().AddAsync(newDelivery, token);
            await unitOfWork.SaveChangesAsync(token);

            newDelivery.Number = $"DLV-{newDelivery.Id:D5}";
            return newDelivery;
        }, ct);

        return await GetDtoAsync(delivery.Id, ct);
    }

    /// <summary>
    /// Çatdırılmanı yola salır. Delivery + Driver + Vehicle statusları
    /// bir tranzaksiyada dəyişir — biri alınmasa hamısı geri qaytarılır.
    /// </summary>
    public async Task<DeliveryDto> StartAsync(int id, CancellationToken ct = default)
    {
        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var delivery = await unitOfWork.Repository<Delivery>().Query()
                .Include(d => d.Vehicle)
                .Include(d => d.Driver)
                .FirstOrDefaultAsync(d => d.Id == id, token)
                ?? throw new NotFoundException("Çatdırılma", id);

            if (delivery.Status != DeliveryStatus.Planned)
                throw new ConflictException("Yalnız planlaşdırılmış çatdırılma yola salına bilər.");
            if (delivery.Driver.Status != DriverStatus.Available)
                throw new ConflictException("Sürücü hazırda başqa səfərdədir və ya deaktivdir.");
            if (delivery.Vehicle.Status != VehicleStatus.Active)
                throw new ConflictException("Avtomobil hazırda istifadəyə yararlı deyil.");

            delivery.Status = DeliveryStatus.InTransit;
            delivery.StartedAtUtc = DateTime.UtcNow;
            delivery.Driver.Status = DriverStatus.OnTrip;
            delivery.Vehicle.Status = VehicleStatus.OnTrip;
        }, ct);

        var dto = await GetDtoAsync(id, ct);

        await notifications.NotifyModuleAsync(
            AppModule.Transport,
            "🚚 Çatdırılma yola düşdü",
            $"{dto.Number} — {dto.CustomerName} ({dto.VehiclePlate}, {dto.DriverName})",
            "/transport/deliveries", ct);

        return dto;
    }

    public async Task<DeliveryDto> CompleteAsync(int id, CancellationToken ct = default)
    {
        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var delivery = await unitOfWork.Repository<Delivery>().Query()
                .Include(d => d.Vehicle)
                .Include(d => d.Driver)
                .FirstOrDefaultAsync(d => d.Id == id, token)
                ?? throw new NotFoundException("Çatdırılma", id);

            if (delivery.Status != DeliveryStatus.InTransit)
                throw new ConflictException("Yalnız yolda olan çatdırılma tamamlana bilər.");

            delivery.Status = DeliveryStatus.Delivered;
            delivery.DeliveredAtUtc = DateTime.UtcNow;
            delivery.Driver.Status = DriverStatus.Available;
            delivery.Vehicle.Status = VehicleStatus.Active;
        }, ct);

        var dto = await GetDtoAsync(id, ct);

        await notifications.NotifyModuleAsync(
            AppModule.Transport,
            "✅ Çatdırılma tamamlandı",
            $"{dto.Number} — {dto.CustomerName} təhvil verildi.",
            "/transport/deliveries", ct);

        return dto;
    }

    public async Task<DeliveryDto> CancelAsync(int id, CancellationToken ct = default)
    {
        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var delivery = await unitOfWork.Repository<Delivery>().Query()
                .Include(d => d.Vehicle)
                .Include(d => d.Driver)
                .FirstOrDefaultAsync(d => d.Id == id, token)
                ?? throw new NotFoundException("Çatdırılma", id);

            if (delivery.Status is DeliveryStatus.Delivered or DeliveryStatus.Cancelled)
                throw new ConflictException("Tamamlanmış və ya ləğv edilmiş çatdırılma ləğv edilə bilməz.");

            // Yoldadırsa sürücü və avtomobil azad edilir
            if (delivery.Status == DeliveryStatus.InTransit)
            {
                delivery.Driver.Status = DriverStatus.Available;
                delivery.Vehicle.Status = VehicleStatus.Active;
            }

            delivery.Status = DeliveryStatus.Cancelled;
        }, ct);

        return await GetDtoAsync(id, ct);
    }

    private async Task<DeliveryDto> GetDtoAsync(int id, CancellationToken ct) =>
        await unitOfWork.Repository<Delivery>().Query()
            .Where(d => d.Id == id)
            .ProjectTo<DeliveryDto>(mapper.ConfigurationProvider)
            .FirstAsync(ct);
}
