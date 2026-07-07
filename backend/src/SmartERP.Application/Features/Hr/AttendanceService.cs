using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Hr;

public interface IAttendanceService
{
    Task<List<AttendanceDto>> GetByDateAsync(DateOnly date, int? departmentId = null, CancellationToken ct = default);
    Task<AttendanceDto> CheckInAsync(CheckInRequest request, CancellationToken ct = default);
    Task<AttendanceDto> CheckOutAsync(CheckOutRequest request, CancellationToken ct = default);
}

public class AttendanceService(IUnitOfWork unitOfWork, IMapper mapper) : IAttendanceService
{
    // İş gününün başlanğıcı — bundan gec check-in "Gecikmə" sayılır
    private static readonly TimeOnly WorkDayStart = new(9, 30);

    public async Task<List<AttendanceDto>> GetByDateAsync(DateOnly date, int? departmentId = null, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<Attendance>().Query().Where(a => a.Date == date);
        if (departmentId is not null)
            query = query.Where(a => a.Employee.DepartmentId == departmentId);

        return await query
            .OrderBy(a => a.Employee.FirstName)
            .ProjectTo<AttendanceDto>(mapper.ConfigurationProvider)
            .ToListAsync(ct);
    }

    public async Task<AttendanceDto> CheckInAsync(CheckInRequest request, CancellationToken ct = default)
    {
        if (!await unitOfWork.Repository<Employee>().AnyAsync(e => e.Id == request.EmployeeId, ct))
            throw new NotFoundException("İşçi", request.EmployeeId);

        var today = DateOnly.FromDateTime(DateTime.Now);
        var now = TimeOnly.FromDateTime(DateTime.Now);

        var repo = unitOfWork.Repository<Attendance>();
        if (await repo.AnyAsync(a => a.EmployeeId == request.EmployeeId && a.Date == today, ct))
            throw new ConflictException("Bu işçi bu gün artıq check-in edib.");

        var attendance = new Attendance
        {
            EmployeeId = request.EmployeeId,
            Date = today,
            CheckIn = now,
            Status = now > WorkDayStart ? AttendanceStatus.Late : AttendanceStatus.Present
        };

        await repo.AddAsync(attendance, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return await GetDtoAsync(attendance.Id, ct);
    }

    public async Task<AttendanceDto> CheckOutAsync(CheckOutRequest request, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);

        var attendance = await unitOfWork.Repository<Attendance>()
            .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.Date == today, ct)
            ?? throw new NotFoundException("Bu gün üçün check-in qeydi", request.EmployeeId);

        if (attendance.CheckOut is not null)
            throw new ConflictException("Bu işçi bu gün artıq check-out edib.");

        attendance.CheckOut = TimeOnly.FromDateTime(DateTime.Now);
        await unitOfWork.SaveChangesAsync(ct);
        return await GetDtoAsync(attendance.Id, ct);
    }

    private async Task<AttendanceDto> GetDtoAsync(int id, CancellationToken ct) =>
        await unitOfWork.Repository<Attendance>().Query()
            .Where(a => a.Id == id)
            .ProjectTo<AttendanceDto>(mapper.ConfigurationProvider)
            .FirstAsync(ct);
}
