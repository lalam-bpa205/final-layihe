using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Hr;

public interface IHrSummaryService
{
    Task<HrSummaryDto> GetSummaryAsync(CancellationToken ct = default);
}

public class HrSummaryService(IUnitOfWork unitOfWork) : IHrSummaryService
{
    public async Task<HrSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var nextMonthStart = monthStart.AddMonths(1);

        var employeeRepo = unitOfWork.Repository<Employee>();
        var leaveRepo = unitOfWork.Repository<LeaveRequest>();

        // Aktiv (işdən çıxmamış) işçilər — soft delete filtri avtomatikdir
        var activeEmployees = employeeRepo.Query()
            .Where(e => e.Status != EmployeeStatus.Terminated);

        var headcount = await activeEmployees.CountAsync(ct);

        var newHiresThisMonth = await activeEmployees
            .CountAsync(e => e.HireDate >= monthStart && e.HireDate < nextMonthStart, ct);

        // Bu gün təsdiqlənmiş məzuniyyətdə olanlar
        var onLeaveToday = await leaveRepo.Query()
            .Where(lr => lr.Status == LeaveStatus.Approved &&
                         lr.StartDate <= today && lr.EndDate >= today)
            .Select(lr => lr.EmployeeId)
            .Distinct()
            .CountAsync(ct);

        var pendingLeaveCount = await leaveRepo
            .CountAsync(lr => lr.Status == LeaveStatus.Pending, ct);

        // Bu ayın doğum günləri (ay üzrə filtr yaddaşda — DateOnly.Month tərcümə riskindən qaçmaq üçün)
        var withBirthDate = await activeEmployees
            .Where(e => e.BirthDate != null)
            .Select(e => new { e.Id, e.FirstName, e.LastName, BirthDate = e.BirthDate!.Value })
            .ToListAsync(ct);

        var birthdaysThisMonth = withBirthDate
            .Where(e => e.BirthDate.Month == today.Month)
            .OrderBy(e => e.BirthDate.Day)
            .Select(e => new BirthdayItemDto
            {
                EmployeeId = e.Id,
                FullName = e.FirstName + " " + e.LastName,
                Date = new DateOnly(today.Year, e.BirthDate.Month,
                    Math.Min(e.BirthDate.Day, DateTime.DaysInMonth(today.Year, e.BirthDate.Month)))
            })
            .ToList();

        // Şöbələr üzrə paylanma
        var departmentDistribution = await activeEmployees
            .GroupBy(e => e.Department.Name)
            .Select(g => new DepartmentCountDto { Name = g.Key, Count = g.Count() })
            .OrderByDescending(d => d.Count)
            .ToListAsync(ct);

        // Bu günün davamiyyəti
        var todayCounts = await unitOfWork.Repository<Attendance>().Query()
            .Where(a => a.Date == today)
            .GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var recordedToday = todayCounts.Sum(c => c.Count);

        return new HrSummaryDto
        {
            Headcount = headcount,
            NewHiresThisMonth = newHiresThisMonth,
            OnLeaveToday = onLeaveToday,
            PendingLeaveCount = pendingLeaveCount,
            BirthdaysThisMonth = birthdaysThisMonth,
            DepartmentDistribution = departmentDistribution,
            AttendanceToday = new AttendanceTodayDto
            {
                Present = todayCounts.FirstOrDefault(c => c.Status == AttendanceStatus.Present)?.Count ?? 0,
                Late = todayCounts.FirstOrDefault(c => c.Status == AttendanceStatus.Late)?.Count ?? 0,
                OnLeave = todayCounts.FirstOrDefault(c => c.Status == AttendanceStatus.OnLeave)?.Count ?? 0,
                // absent = aktiv işçi sayı - bu gün qeydi olanlar
                Absent = Math.Max(0, headcount - recordedToday)
            }
        };
    }
}
