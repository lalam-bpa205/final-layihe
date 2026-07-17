using Mapster;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Entities.Hr;

namespace SmartERP.Application.Features.Hr;

public class HrMappingRegister : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Department, DepartmentDto>()
            .Map(d => d.EmployeeCount, s => s.Employees.Count);

        config.NewConfig<Position, PositionDto>()
            .Map(d => d.DepartmentName, s => s.Department.Name)
            .Map(d => d.EmployeeCount, s => s.Employees.Count);

        config.NewConfig<Employee, EmployeeDto>()
            .Map(d => d.DepartmentName, s => s.Department.Name)
            .Map(d => d.PositionTitle, s => s.Position.Title)
            .Map(d => d.WorkScheduleName, s => s.WorkSchedule != null ? s.WorkSchedule.Name : null);

        config.NewConfig<WorkSchedule, WorkScheduleDto>()
            .Map(d => d.EmployeeCount, s => s.Employees.Count)
            .Map(d => d.WorkDayCount, s =>
                (s.Monday ? 1 : 0) + (s.Tuesday ? 1 : 0) + (s.Wednesday ? 1 : 0) +
                (s.Thursday ? 1 : 0) + (s.Friday ? 1 : 0) + (s.Saturday ? 1 : 0) + (s.Sunday ? 1 : 0));

        config.NewConfig<Attendance, AttendanceDto>()
            .Map(d => d.EmployeeName, s => s.Employee.FirstName + " " + s.Employee.LastName);

        config.NewConfig<LeaveRequest, LeaveRequestDto>()
            .Map(d => d.EmployeeName, s => s.Employee.FirstName + " " + s.Employee.LastName)
            .Map(d => d.DecidedByUserName, s => s.DecidedByUser != null ? s.DecidedByUser.UserName : null);
    }
}
