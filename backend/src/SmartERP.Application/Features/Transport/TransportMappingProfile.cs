using Mapster;
using SmartERP.Application.Features.Transport.Dtos;
using SmartERP.Application.Features.Transport.Fuel;
using SmartERP.Domain.Entities.Transport;

namespace SmartERP.Application.Features.Transport;

public class TransportMappingRegister : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Vehicle, VehicleDto>();

        config.NewConfig<Driver, DriverDto>()
            .Map(d => d.FullName, s => s.Employee.FirstName + " " + s.Employee.LastName)
            .Map(d => d.Phone, s => s.Employee.Phone);

        config.NewConfig<Delivery, DeliveryDto>()
            .Map(d => d.VehiclePlate, s => s.Vehicle.PlateNumber)
            .Map(d => d.DriverName, s => s.Driver.Employee.FirstName + " " + s.Driver.Employee.LastName);

        config.NewConfig<FuelRecord, FuelRecordDto>()
            .Map(d => d.VehiclePlate, s => s.Vehicle.PlateNumber)
            .Map(d => d.DriverName, s =>
                s.Driver != null ? s.Driver.Employee.FirstName + " " + s.Driver.Employee.LastName : null)
            .Map(d => d.FuelSourceName, s => s.FuelSource != null ? s.FuelSource.Name : null);

        config.NewConfig<FuelSource, FuelSourceDto>();

        config.NewConfig<MaintenanceRecord, MaintenanceRecordDto>()
            .Map(d => d.VehiclePlate, s => s.Vehicle.PlateNumber);
    }
}
