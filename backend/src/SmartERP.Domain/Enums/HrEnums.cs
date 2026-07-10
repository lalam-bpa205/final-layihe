namespace SmartERP.Domain.Enums;

public enum AttendanceStatus
{
    Present = 1,
    Late = 2,
    Absent = 3,
    OnLeave = 4
}

public enum LeaveType
{
    Annual = 1,
    Sick = 2,
    Unpaid = 3,
    Maternity = 4,
    Other = 5
}

public enum EmployeeStatus
{
    Active = 1,
    OnLeave = 2,
    Terminated = 3
}

public enum LeaveStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    Cancelled = 4
}
