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
    Task<MonthlyAttendanceDto> GetMonthlyAsync(int year, int month, int? departmentId = null, CancellationToken ct = default);
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

    public async Task<MonthlyAttendanceDto> GetMonthlyAsync(int year, int month, int? departmentId = null, CancellationToken ct = default)
    {
        if (month is < 1 or > 12)
            throw new ConflictException("Ay dəyəri 1-12 aralığında olmalıdır.");

        var monthStart = new DateOnly(year, month, 1);
        var nextMonthStart = monthStart.AddMonths(1);

        // Aktiv (işdən çıxmamış) işçilər
        var employeeQuery = unitOfWork.Repository<Employee>().Query()
            .Where(e => e.Status != EmployeeStatus.Terminated);
        if (departmentId is not null)
            employeeQuery = employeeQuery.Where(e => e.DepartmentId == departmentId);

        var employeeRows = await employeeQuery
            .OrderBy(e => e.FirstName).ThenBy(e => e.LastName)
            .Select(e => new
            {
                e.Id,
                Name = e.FirstName + " " + e.LastName,
                Schedule = e.WorkSchedule
            })
            .ToListAsync(ct);

        var employees = employeeRows.Select(e => new MonthlyAttendanceEmployeeDto
        {
            EmployeeId = e.Id,
            EmployeeName = e.Name,
            WorkScheduleName = e.Schedule?.Name,
            // Qrafik yoxdursa standart B.e–Cümə fərz olunur
            WorkDays = e.Schedule is null
                ? [true, true, true, true, true, false, false]
                :
                [
                    e.Schedule.Monday, e.Schedule.Tuesday, e.Schedule.Wednesday,
                    e.Schedule.Thursday, e.Schedule.Friday, e.Schedule.Saturday, e.Schedule.Sunday
                ]
        }).ToList();

        var recordQuery = unitOfWork.Repository<Attendance>().Query()
            .Where(a => a.Date >= monthStart && a.Date < nextMonthStart);
        if (departmentId is not null)
            recordQuery = recordQuery.Where(a => a.Employee.DepartmentId == departmentId);

        var rawRecords = await recordQuery
            .OrderBy(a => a.Date)
            .Select(a => new { a.EmployeeId, a.Date, a.Status, a.CheckIn, a.CheckOut })
            .ToListAsync(ct);

        return new MonthlyAttendanceDto
        {
            Employees = employees,
            Records = rawRecords.Select(r => new MonthlyAttendanceRecordDto
            {
                EmployeeId = r.EmployeeId,
                Date = r.Date,
                Status = (int)r.Status,
                CheckIn = r.CheckIn?.ToString("HH:mm:ss"),
                CheckOut = r.CheckOut?.ToString("HH:mm:ss")
            }).ToList()
        };
    }

    public async Task<AttendanceDto> CheckInAsync(CheckInRequest request, CancellationToken ct = default)
    {
        // Təkrar check-in yoxlaması və yazı bir tranzaksiyada — paralel iki
        // sorğu eyni gün üçün ikinci qeyd yarada bilməsin.
        var attendance = await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var employee = await unitOfWork.Repository<Employee>().GetByIdAsync(request.EmployeeId, token)
                ?? throw new NotFoundException("İşçi", request.EmployeeId);

            // İşdən çıxmış işçi check-in edə bilməz
            if (employee.Status == EmployeeStatus.Terminated)
                throw new ConflictException("İşdən çıxmış işçi check-in edə bilməz.");

            var today = DateOnly.FromDateTime(DateTime.Now);
            var now = TimeOnly.FromDateTime(DateTime.Now);

            var repo = unitOfWork.Repository<Attendance>();
            if (await repo.AnyAsync(a => a.EmployeeId == request.EmployeeId && a.Date == today, token))
                throw new ConflictException("Bu işçi bu gün artıq check-in edib.");

            var newRecord = new Attendance
            {
                EmployeeId = request.EmployeeId,
                Date = today,
                CheckIn = now,
                Status = now > WorkDayStart ? AttendanceStatus.Late : AttendanceStatus.Present
            };

            await repo.AddAsync(newRecord, token);
            return newRecord;
        }, ct);

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
