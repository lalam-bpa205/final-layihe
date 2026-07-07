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
    List<string>? Modules = null);

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
