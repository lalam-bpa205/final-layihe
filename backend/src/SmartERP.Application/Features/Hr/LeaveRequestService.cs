using AutoMapper;
using AutoMapper.QueryableExtensions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Extensions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Common.Models;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Entities.Hr;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Hr;

public interface ILeaveRequestService
{
    Task<PagedResult<LeaveRequestDto>> GetPagedAsync(LeaveFilter filter, CancellationToken ct = default);
    Task<LeaveRequestDto> CreateAsync(CreateLeaveRequest request, CancellationToken ct = default);
    Task<LeaveRequestDto> DecideAsync(int id, DecideLeaveRequest request, CancellationToken ct = default);
}

public class LeaveRequestService(
    IUnitOfWork unitOfWork,
    IMapper mapper,
    ICurrentUserService currentUser,
    INotificationService notifications,
    IValidator<CreateLeaveRequest> validator) : ILeaveRequestService
{
    /// <summary>İllik (Annual) məzuniyyət limiti — işçi başına ildə 21 gün.</summary>
    public const int AnnualLeaveAllowanceDays = 21;

    public async Task<PagedResult<LeaveRequestDto>> GetPagedAsync(LeaveFilter filter, CancellationToken ct = default)
    {
        var query = unitOfWork.Repository<LeaveRequest>().Query();

        if (filter.Status is not null)
            query = query.Where(lr => lr.Status == filter.Status);
        if (filter.EmployeeId is not null)
            query = query.Where(lr => lr.EmployeeId == filter.EmployeeId);

        return await query
            .OrderByDescending(lr => lr.Id)
            .ProjectTo<LeaveRequestDto>(mapper.ConfigurationProvider)
            .ToPagedResultAsync(filter.Page, filter.PageSize, ct);
    }

    public async Task<LeaveRequestDto> CreateAsync(CreateLeaveRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);

        var employee = await unitOfWork.Repository<Employee>().GetByIdAsync(request.EmployeeId, ct)
            ?? throw new NotFoundException("İşçi", request.EmployeeId);

        // İşdən çıxmış işçiyə yeni məzuniyyət yaradıla bilməz
        if (employee.Status == EmployeeStatus.Terminated)
            throw new ConflictException("İşdən çıxmış işçi üçün yeni məzuniyyət yaradıla bilməz.");

        // Üst-üstə düşən aktiv (gözləyən/təsdiqlənmiş) məzuniyyət yoxlanışı
        var overlaps = await unitOfWork.Repository<LeaveRequest>().AnyAsync(lr =>
            lr.EmployeeId == request.EmployeeId &&
            (lr.Status == LeaveStatus.Pending || lr.Status == LeaveStatus.Approved) &&
            lr.StartDate <= request.EndDate && request.StartDate <= lr.EndDate, ct);

        if (overlaps)
            throw new ConflictException("Bu tarix aralığında artıq məzuniyyət sorğusu mövcuddur.");

        // İllik məzuniyyət balansı yoxlanışı — cari ildəki approved + pending Annual günlər
        if (request.Type == LeaveType.Annual)
        {
            var year = DateTime.Today.Year;
            var yearStart = new DateOnly(year, 1, 1);
            var nextYearStart = yearStart.AddYears(1);

            var existingAnnual = await unitOfWork.Repository<LeaveRequest>().Query()
                .Where(lr => lr.EmployeeId == request.EmployeeId &&
                             lr.Type == LeaveType.Annual &&
                             (lr.Status == LeaveStatus.Pending || lr.Status == LeaveStatus.Approved) &&
                             lr.StartDate >= yearStart && lr.StartDate < nextYearStart)
                .Select(lr => new { lr.StartDate, lr.EndDate })
                .ToListAsync(ct);

            var usedDays = existingAnnual.Sum(l => l.EndDate.DayNumber - l.StartDate.DayNumber + 1);
            var requestedDays = request.EndDate.DayNumber - request.StartDate.DayNumber + 1;

            if (usedDays + requestedDays > AnnualLeaveAllowanceDays)
                throw new ConflictException(
                    $"İllik məzuniyyət balansı kifayət etmir. Qalıq: {Math.Max(0, AnnualLeaveAllowanceDays - usedDays)} gün.");
        }

        var leave = new LeaveRequest
        {
            EmployeeId = request.EmployeeId,
            Type = request.Type,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Reason = request.Reason
        };

        await unitOfWork.Repository<LeaveRequest>().AddAsync(leave, ct);
        await unitOfWork.SaveChangesAsync(ct);

        var dto = await GetDtoAsync(leave.Id, ct);

        await notifications.NotifyModuleAsync(
            AppModule.Hr,
            "Yeni məzuniyyət sorğusu",
            $"{dto.EmployeeName}: {dto.StartDate} — {dto.EndDate}",
            "/hr/leave-requests", ct);

        return dto;
    }

    public async Task<LeaveRequestDto> DecideAsync(int id, DecideLeaveRequest request, CancellationToken ct = default)
    {
        var leave = await unitOfWork.Repository<LeaveRequest>().GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Məzuniyyət sorğusu", id);

        if (leave.Status != LeaveStatus.Pending)
            throw new ConflictException("Yalnız gözləyən sorğular üzrə qərar verilə bilər.");

        // Qərar + təsdiq halında davamiyyət qeydləri — bir tranzaksiyada.
        // Davamiyyət yazılarkən xəta olsa, qərar da geri qaytarılır (rollback).
        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            leave.Status = request.Approve ? LeaveStatus.Approved : LeaveStatus.Rejected;
            leave.DecidedByUserId = currentUser.UserId;
            leave.DecidedAtUtc = DateTime.UtcNow;
            leave.DecisionNote = request.Note;

            if (request.Approve)
            {
                var attendanceRepo = unitOfWork.Repository<Attendance>();
                var existing = await attendanceRepo.Query()
                    .Where(a => a.EmployeeId == leave.EmployeeId &&
                                a.Date >= leave.StartDate && a.Date <= leave.EndDate)
                    .ToListAsync(token);

                for (var date = leave.StartDate; date <= leave.EndDate; date = date.AddDays(1))
                {
                    var record = existing.FirstOrDefault(a => a.Date == date);
                    if (record is not null)
                    {
                        record.Status = AttendanceStatus.OnLeave;
                        record.Note = "Məzuniyyət";
                    }
                    else
                    {
                        await attendanceRepo.AddAsync(new Attendance
                        {
                            EmployeeId = leave.EmployeeId,
                            Date = date,
                            Status = AttendanceStatus.OnLeave,
                            Note = "Məzuniyyət"
                        }, token);
                    }
                }
            }
        }, ct);

        return await GetDtoAsync(id, ct);
    }

    private async Task<LeaveRequestDto> GetDtoAsync(int id, CancellationToken ct) =>
        await unitOfWork.Repository<LeaveRequest>().Query()
            .Where(lr => lr.Id == id)
            .ProjectTo<LeaveRequestDto>(mapper.ConfigurationProvider)
            .FirstAsync(ct);
}
