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
            .ForMember(d => d.PositionTitle, o => o.MapFrom(s => s.Position.Title));

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
