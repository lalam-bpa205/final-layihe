using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using SmartERP.Application.Features.Auth;
using SmartERP.Application.Features.Hr;
using SmartERP.Application.Features.Inventory;
using SmartERP.Application.Features.Dashboard;
using SmartERP.Application.Features.Finance;
using SmartERP.Application.Features.Sales;
using SmartERP.Application.Features.Transport;

namespace SmartERP.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddAutoMapper(_ => { }, assembly);
        services.AddValidatorsFromAssembly(assembly);

        services.AddScoped<IAuthService, AuthService>();

        services.AddScoped<IDepartmentService, DepartmentService>();
        services.AddScoped<IPositionService, PositionService>();
        services.AddScoped<IEmployeeService, EmployeeService>();
        services.AddScoped<IAttendanceService, AttendanceService>();
        services.AddScoped<ILeaveRequestService, LeaveRequestService>();
        services.AddScoped<IHrSummaryService, HrSummaryService>();
        services.AddScoped<IWorkScheduleService, WorkScheduleService>();

        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IWarehouseService, WarehouseService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IStockService, StockService>();
        services.AddScoped<IInventorySummaryService, InventorySummaryService>();

        services.AddScoped<IVehicleService, VehicleService>();
        services.AddScoped<IDriverService, DriverService>();
        services.AddScoped<IDeliveryService, DeliveryService>();
        services.AddScoped<IVehicleLogService, VehicleLogService>();
        services.AddScoped<ITransportSummaryService, TransportSummaryService>();

        services.AddScoped<ITransactionCategoryService, TransactionCategoryService>();
        services.AddScoped<IFinanceTransactionService, FinanceTransactionService>();
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<IFinanceOverviewService, FinanceOverviewService>();

        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<ISalesOrderService, SalesOrderService>();
        services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
        services.AddScoped<ISalesOverviewService, SalesOverviewService>();

        services.AddScoped<IDashboardService, DashboardService>();

        return services;
    }
}
