using AutoMapper;
using SmartERP.Application.Features.Hr.Dtos;
using SmartERP.Domain.Entities.Hr;

namespace SmartERP.Application.Features.Hr;

public class HrMappingProfile : Profile
{
    public HrMappingProfile()
    {
        CreateMap<Department, DepartmentDto>()
            .ForMember(d => d.EmployeeCount, o => o.MapFrom(s => s.Employees.Count));

        CreateMap<Position, PositionDto>()
            .ForMember(d => d.DepartmentName, o => o.MapFrom(s => s.Department.Name))
            .ForMember(d => d.EmployeeCount, o => o.MapFrom(s => s.Employees.Count));

        CreateMap<Employee, EmployeeDto>()
            .ForMember(d => d.DepartmentName, o => o.MapFrom(s => s.Department.Name))
            .ForMember(d => d.PositionTitle, o => o.MapFrom(s => s.Position.Title))
            .ForMember(d => d.WorkScheduleName,
                o => o.MapFrom(s => s.WorkSchedule != null ? s.WorkSchedule.Name : null));

        CreateMap<WorkSchedule, WorkScheduleDto>()
            .ForMember(d => d.EmployeeCount, o => o.MapFrom(s => s.Employees.Count))
            .ForMember(d => d.WorkDayCount, o => o.MapFrom(s =>
                (s.Monday ? 1 : 0) + (s.Tuesday ? 1 : 0) + (s.Wednesday ? 1 : 0) +
                (s.Thursday ? 1 : 0) + (s.Friday ? 1 : 0) + (s.Saturday ? 1 : 0) + (s.Sunday ? 1 : 0)));

        CreateMap<Attendance, AttendanceDto>()
            .ForMember(d => d.EmployeeName,
                o => o.MapFrom(s => s.Employee.FirstName + " " + s.Employee.LastName));

        CreateMap<LeaveRequest, LeaveRequestDto>()
            .ForMember(d => d.EmployeeName,
                o => o.MapFrom(s => s.Employee.FirstName + " " + s.Employee.LastName))
            .ForMember(d => d.DecidedByUserName,
                o => o.MapFrom(s => s.DecidedByUser != null ? s.DecidedByUser.UserName : null));
    }
}
