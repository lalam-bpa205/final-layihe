using MapsterMapper;
using Mapster;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Entities.Transport;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Transport;

public interface IDriverService
{
    Task<List<DriverDto>> GetAllAsync(DriverStatus? status = null, CancellationToken ct = default);
    Task<List<DriverDto>> GetExpiringLicensesAsync(int withinDays = 30, CancellationToken ct = default);
    Task<DriverDto> CreateAsync(SaveDriverRequest request, CancellationToken ct = default);
    Task<DriverDto> UpdateAsync(int id, SaveDriverRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class DriverService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    IValidator<SaveDriverRequest> validator) : IDriverService
{
    public async Task<List<DriverDto>> GetAllAsync(DriverStatus? status = null, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<Driver>().Query();
        if (status is not null)
            query = query.Where(d => d.Status == status);

        return await query
            .OrderBy(d => d.Employee.FirstName)
            .ProjectToType<DriverDto>()
            .ToListAsync(ct);
    }

    /// <summary>Vəsiqəsinin müddəti yaxın günlərdə bitən sürücülər (xəbərdarlıq üçün).</summary>
    public async Task<List<DriverDto>> GetExpiringLicensesAsync(int withinDays = 30, CancellationToken ct = default)
    {
        var deadline = DateOnly.FromDateTime(DateTime.Today).AddDays(withinDays);

        return await unitOfWork.Repository<Driver>().Query()
            .Where(d => d.LicenseExpiryDate <= deadline)
            .OrderBy(d => d.LicenseExpiryDate)
            .ProjectToType<DriverDto>()
            .ToListAsync(ct);
    }

    public async Task<DriverDto> CreateAsync(SaveDriverRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        if (!await unitOfWork.Repository<Employee>().AnyAsync(e => e.Id == request.EmployeeId, ct))
            throw new NotFoundException("İşçi", request.EmployeeId);

        var repo = unitOfWork.Repository<Driver>();
        if (await repo.AnyAsync(d => d.EmployeeId == request.EmployeeId, ct))
            throw new ConflictException("Bu işçi artıq sürücü kimi qeydiyyatdadır.");
        if (await repo.AnyAsync(d => d.LicenseNumber == request.LicenseNumber, ct))
            throw new ConflictException("Bu vəsiqə nömrəsi artıq qeydiyyatdadır.");

        var driver = new Driver
        {
            EmployeeId = request.EmployeeId,
            LicenseNumber = request.LicenseNumber,
            LicenseCategories = request.LicenseCategories,
            LicenseExpiryDate = request.LicenseExpiryDate
        };

        await repo.AddAsync(driver, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return await GetDtoAsync(driver.Id, ct);
    }

    public async Task<DriverDto> UpdateAsync(int id, SaveDriverRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var repo = unitOfWork.Repository<Driver>();
        var driver = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Sürücü", id);

        if (await repo.AnyAsync(d => d.LicenseNumber == request.LicenseNumber && d.Id != id, ct))
            throw new ConflictException("Bu vəsiqə nömrəsi artıq qeydiyyatdadır.");

        // İşçi bağlantısı dəyişdirilmir — yalnız vəsiqə məlumatları yenilənir
        driver.LicenseNumber = request.LicenseNumber;
        driver.LicenseCategories = request.LicenseCategories;
        driver.LicenseExpiryDate = request.LicenseExpiryDate;

        await unitOfWork.SaveChangesAsync(ct);
        return await GetDtoAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var repo = unitOfWork.Repository<Driver>();
        var driver = await repo.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Sürücü", id);

        if (driver.Status == DriverStatus.OnTrip)
            throw new ConflictException("Səfərdə olan sürücü silinə bilməz.");

        if (await unitOfWork.Repository<Delivery>().AnyAsync(d => d.DriverId == id, ct))
            throw new ConflictException("Bu sürücünün çatdırılma tarixçəsi var — silmək əvəzinə deaktiv edin.");

        repo.Remove(driver);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private async Task<DriverDto> GetDtoAsync(int id, CancellationToken ct) =>
        await unitOfWork.Repository<Driver>().Query()
            .Where(d => d.Id == id)
            .ProjectToType<DriverDto>()
            .FirstAsync(ct);
}
