namespace SmartERP.Domain.Enums;

public enum VehicleType
{
    Truck = 1,
    Van = 2,
    Car = 3,
    Trailer = 4
}

public enum VehicleStatus
{
    Active = 1,
    OnTrip = 2,
    InMaintenance = 3,
    Inactive = 4
}

public enum DriverStatus
{
    Available = 1,
    OnTrip = 2,
    Inactive = 3
}

public enum DeliveryStatus
{
    Planned = 1,
    InTransit = 2,
    Delivered = 3,
    Cancelled = 4
}
