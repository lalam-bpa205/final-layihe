using AutoMapper;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Application.Features.Transport.Fuel;
using SmartERP.Domain.Entities.Transport;

namespace SmartERP.Application.Features.Transport;

public class TransportMappingProfile : Profile
{
    public TransportMappingProfile()
    {
        CreateMap<Vehicle, VehicleDto>();

        CreateMap<Driver, DriverDto>()
            .ForMember(d => d.FullName,
                o => o.MapFrom(s => s.Employee.FirstName + " " + s.Employee.LastName))
            .ForMember(d => d.Phone, o => o.MapFrom(s => s.Employee.Phone));

        CreateMap<Delivery, DeliveryDto>()
            .ForMember(d => d.VehiclePlate, o => o.MapFrom(s => s.Vehicle.PlateNumber))
            .ForMember(d => d.DriverName,
                o => o.MapFrom(s => s.Driver.Employee.FirstName + " " + s.Driver.Employee.LastName));

        CreateMap<FuelRecord, FuelRecordDto>()
            .ForMember(d => d.VehiclePlate, o => o.MapFrom(s => s.Vehicle.PlateNumber))
            .ForMember(d => d.DriverName, o => o.MapFrom(s =>
                s.Driver != null ? s.Driver.Employee.FirstName + " " + s.Driver.Employee.LastName : null))
            .ForMember(d => d.FuelSourceName, o => o.MapFrom(s => s.FuelSource != null ? s.FuelSource.Name : null));

        CreateMap<FuelSource, FuelSourceDto>();

        CreateMap<MaintenanceRecord, MaintenanceRecordDto>()
            .ForMember(d => d.VehiclePlate, o => o.MapFrom(s => s.Vehicle.PlateNumber));
    }
}
