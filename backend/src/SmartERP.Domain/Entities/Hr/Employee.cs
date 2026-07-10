using SmartERP.Domain.Common;
using SmartERP.Domain.Entities.Auth;
using SmartERP.Domain.Enums;

namespace SmartERP.Domain.Entities.Hr;

public class Employee : BaseEntity
{
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public DateOnly? BirthDate { get; set; }
    public DateOnly HireDate { get; set; }
    public decimal Salary { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContact { get; set; }
    public string? Notes { get; set; }
    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;

    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public int PositionId { get; set; }
    public Position Position { get; set; } = null!;

    /// <summary>Sistemə giriş hesabı (opsional) — hər işçinin user-i olmaya bilər.</summary>
    public int? UserId { get; set; }
    public User? User { get; set; }

    public ICollection<Attendance> Attendances { get; set; } = [];
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = [];
}
