namespace SmartERP.Domain.Constants;

public static class RoleNames
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string HRManager = "HRManager";
    public const string FinanceManager = "FinanceManager";
    public const string WarehouseManager = "WarehouseManager";
    public const string TransportManager = "TransportManager";
    public const string Employee = "Employee";

    public static readonly string[] All =
    [
        SuperAdmin, Admin, HRManager, FinanceManager,
        WarehouseManager, TransportManager, Employee
    ];
}
