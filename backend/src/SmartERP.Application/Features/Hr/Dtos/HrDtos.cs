using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Hr.Dtos;

// ---------- Department ----------
public class DepartmentDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int EmployeeCount { get; set; }
}

public record SaveDepartmentRequest(string Name, string? Description);

// ---------- Position ----------
public class PositionDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = null!;
    public int EmployeeCount { get; set; }
}

public record SavePositionRequest(string Title, string? Description, int DepartmentId);

// ---------- WorkSchedule (iş qrafiki) ----------
public class WorkScheduleDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public bool Monday { get; set; }
    public bool Tuesday { get; set; }
    public bool Wednesday { get; set; }
    public bool Thursday { get; set; }
    public bool Friday { get; set; }
    public bool Saturday { get; set; }
    public bool Sunday { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int EmployeeCount { get; set; }
    /// <summary>İş günlərinin sayı (1–7).</summary>
    public int WorkDayCount { get; set; }
}

public record SaveWorkScheduleRequest(
    string Name,
    bool Monday, bool Tuesday, bool Wednesday, bool Thursday,
    bool Friday, bool Saturday, bool Sunday,
    TimeOnly StartTime, TimeOnly EndTime);

// ---------- Employee ----------
public class EmployeeDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public DateOnly? BirthDate { get; set; }
    public DateOnly HireDate { get; set; }
    public decimal Salary { get; set; }
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = null!;
    public int PositionId { get; set; }
    public string PositionTitle { get; set; } = null!;
    public int? UserId { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContact { get; set; }
    public string? Notes { get; set; }
    public EmployeeStatus Status { get; set; }
    public int? WorkScheduleId { get; set; }
    public string? WorkScheduleName { get; set; }
}

public record SaveEmployeeRequest(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    DateOnly? BirthDate,
    DateOnly HireDate,
    decimal Salary,
    int DepartmentId,
    int PositionId,
    bool CreateUserAccount = false,
    string? UserName = null,
    string? Password = null,
    List<string>? Modules = null,
    string? Address = null,
    string? EmergencyContact = null,
    string? Notes = null,
    int? WorkScheduleId = null);

public record SetEmployeeModulesRequest(List<string> Modules);

public record EmployeeFilter(
    int Page = 1,
    int PageSize = 10,
    string? Search = null,
    int? DepartmentId = null,
    int? PositionId = null,
    string? SortBy = null,
    bool SortDesc = false);

// ---------- Attendance ----------
public class AttendanceDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = null!;
    public DateOnly Date { get; set; }
    public TimeOnly? CheckIn { get; set; }
    public TimeOnly? CheckOut { get; set; }
    public AttendanceStatus Status { get; set; }
    public string? Note { get; set; }
}

public record CheckInRequest(int EmployeeId);
public record CheckOutRequest(int EmployeeId);

// ---------- LeaveRequest ----------
public class LeaveRequestDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = null!;
    public LeaveType Type { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string? Reason { get; set; }
    public LeaveStatus Status { get; set; }
    public string? DecidedByUserName { get; set; }
    public DateTime? DecidedAtUtc { get; set; }
    public string? DecisionNote { get; set; }
    public DateTime CreatedDate { get; set; }
}

public record CreateLeaveRequest(
    int EmployeeId,
    LeaveType Type,
    DateOnly StartDate,
    DateOnly EndDate,
    string? Reason);

public record DecideLeaveRequest(bool Approve, string? Note);

public record LeaveFilter(
    int Page = 1,
    int PageSize = 10,
    LeaveStatus? Status = null,
    int? EmployeeId = null);

// ---------- HR icmalı (summary) ----------
public class HrSummaryDto
{
    public int Headcount { get; set; }
    public int NewHiresThisMonth { get; set; }
    public int OnLeaveToday { get; set; }
    public int PendingLeaveCount { get; set; }
    public List<BirthdayItemDto> BirthdaysThisMonth { get; set; } = [];
    public List<DepartmentCountDto> DepartmentDistribution { get; set; } = [];
    public AttendanceTodayDto AttendanceToday { get; set; } = new();
}

public class BirthdayItemDto
{
    public int EmployeeId { get; set; }
    public string FullName { get; set; } = null!;
    public DateOnly Date { get; set; }
}

public class DepartmentCountDto
{
    public string Name { get; set; } = null!;
    public int Count { get; set; }
}

public class AttendanceTodayDto
{
    public int Present { get; set; }
    public int Late { get; set; }
    public int Absent { get; set; }
    public int OnLeave { get; set; }
}

// ---------- İşçi profili ----------
public class EmployeeProfileDto
{
    public EmployeeDto Employee { get; set; } = null!;
    public AttendanceSummaryDto AttendanceSummary { get; set; } = new();
    public LeaveBalanceDto LeaveBalance { get; set; } = new();
    public List<LeaveRequestDto> RecentLeaves { get; set; } = [];
    public List<AttendanceDto> RecentAttendance { get; set; } = [];
}

public class AttendanceSummaryDto
{
    public int PresentDays { get; set; }
    public int LateDays { get; set; }
    public int AbsentDays { get; set; }
    public int OnLeaveDays { get; set; }
}

public class LeaveBalanceDto
{
    public int TotalDays { get; set; }
    public int UsedDays { get; set; }
    public int RemainingDays { get; set; }
}

// ---------- Aylıq davamiyyət cədvəli ----------
public class MonthlyAttendanceDto
{
    public List<MonthlyAttendanceEmployeeDto> Employees { get; set; } = [];
    public List<MonthlyAttendanceRecordDto> Records { get; set; } = [];
}

public class MonthlyAttendanceEmployeeDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = null!;
    public string? WorkScheduleName { get; set; }
    /// <summary>İş günləri: [Mon, Tue, Wed, Thu, Fri, Sat, Sun]. Qrafik yoxdursa B.e–Cümə fərz olunur.</summary>
    public bool[] WorkDays { get; set; } = [true, true, true, true, true, false, false];
}

public class MonthlyAttendanceRecordDto
{
    public int EmployeeId { get; set; }
    public DateOnly Date { get; set; }
    public int Status { get; set; }
    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }
}
