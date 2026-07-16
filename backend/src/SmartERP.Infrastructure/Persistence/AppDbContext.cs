using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SmartERP.Domain.Common;

namespace SmartERP.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Domain.Entities.Auth.User> Users => Set<Domain.Entities.Auth.User>();
    public DbSet<Domain.Entities.Auth.Role> Roles => Set<Domain.Entities.Auth.Role>();
    public DbSet<Domain.Entities.Auth.UserRole> UserRoles => Set<Domain.Entities.Auth.UserRole>();
    public DbSet<Domain.Entities.Auth.RefreshToken> RefreshTokens => Set<Domain.Entities.Auth.RefreshToken>();
    public DbSet<Domain.Entities.Auth.UserModuleAccess> UserModuleAccesses => Set<Domain.Entities.Auth.UserModuleAccess>();

    public DbSet<Domain.Entities.Hr.Department> Departments => Set<Domain.Entities.Hr.Department>();
    public DbSet<Domain.Entities.Hr.Position> Positions => Set<Domain.Entities.Hr.Position>();
    public DbSet<Domain.Entities.Hr.Employee> Employees => Set<Domain.Entities.Hr.Employee>();
    public DbSet<Domain.Entities.Hr.Attendance> Attendances => Set<Domain.Entities.Hr.Attendance>();
    public DbSet<Domain.Entities.Hr.LeaveRequest> LeaveRequests => Set<Domain.Entities.Hr.LeaveRequest>();
    public DbSet<Domain.Entities.Hr.WorkSchedule> WorkSchedules => Set<Domain.Entities.Hr.WorkSchedule>();

    public DbSet<Domain.Entities.Inventory.Category> Categories => Set<Domain.Entities.Inventory.Category>();
    public DbSet<Domain.Entities.Inventory.Warehouse> Warehouses => Set<Domain.Entities.Inventory.Warehouse>();
    public DbSet<Domain.Entities.Inventory.Product> Products => Set<Domain.Entities.Inventory.Product>();
    public DbSet<Domain.Entities.Inventory.StockMovement> StockMovements => Set<Domain.Entities.Inventory.StockMovement>();

    public DbSet<Domain.Entities.Transport.Vehicle> Vehicles => Set<Domain.Entities.Transport.Vehicle>();
    public DbSet<Domain.Entities.Transport.Driver> Drivers => Set<Domain.Entities.Transport.Driver>();
    public DbSet<Domain.Entities.Transport.Delivery> Deliveries => Set<Domain.Entities.Transport.Delivery>();
    public DbSet<Domain.Entities.Transport.FuelRecord> FuelRecords => Set<Domain.Entities.Transport.FuelRecord>();
    public DbSet<Domain.Entities.Transport.FuelSource> FuelSources => Set<Domain.Entities.Transport.FuelSource>();
    public DbSet<Domain.Entities.Transport.MaintenanceRecord> MaintenanceRecords => Set<Domain.Entities.Transport.MaintenanceRecord>();
    public DbSet<Domain.Entities.Transport.VehicleLocation> VehicleLocations => Set<Domain.Entities.Transport.VehicleLocation>();

    public DbSet<Domain.Entities.Finance.TransactionCategory> TransactionCategories => Set<Domain.Entities.Finance.TransactionCategory>();
    public DbSet<Domain.Entities.Finance.FinanceTransaction> FinanceTransactions => Set<Domain.Entities.Finance.FinanceTransaction>();
    public DbSet<Domain.Entities.Finance.Budget> Budgets => Set<Domain.Entities.Finance.Budget>();
    public DbSet<Domain.Entities.Finance.Invoice> Invoices => Set<Domain.Entities.Finance.Invoice>();
    public DbSet<Domain.Entities.Finance.InvoiceItem> InvoiceItems => Set<Domain.Entities.Finance.InvoiceItem>();
    public DbSet<Domain.Entities.Finance.Payment> Payments => Set<Domain.Entities.Finance.Payment>();

    public DbSet<Domain.Entities.Sales.Customer> Customers => Set<Domain.Entities.Sales.Customer>();
    public DbSet<Domain.Entities.Sales.Supplier> Suppliers => Set<Domain.Entities.Sales.Supplier>();
    public DbSet<Domain.Entities.Sales.SalesOrder> SalesOrders => Set<Domain.Entities.Sales.SalesOrder>();
    public DbSet<Domain.Entities.Sales.SalesOrderItem> SalesOrderItems => Set<Domain.Entities.Sales.SalesOrderItem>();
    public DbSet<Domain.Entities.Sales.PurchaseOrder> PurchaseOrders => Set<Domain.Entities.Sales.PurchaseOrder>();
    public DbSet<Domain.Entities.Sales.PurchaseOrderItem> PurchaseOrderItems => Set<Domain.Entities.Sales.PurchaseOrderItem>();

    public DbSet<Domain.Entities.Notifications.Notification> Notifications => Set<Domain.Entities.Notifications.Notification>();
    public DbSet<Domain.Entities.Chat.ChatMessage> ChatMessages => Set<Domain.Entities.Chat.ChatMessage>();
    public DbSet<Domain.Entities.Audit.AuditLog> AuditLogs => Set<Domain.Entities.Audit.AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Hər entity üçün ayrıca konfiqurasiya faylları (IEntityTypeConfiguration) avtomatik yüklənir
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Global soft-delete filtri: IsDeleted=1 olan sətirlər heç bir sorğuda görünmür
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                var body = Expression.Equal(
                    Expression.Property(parameter, nameof(BaseEntity.IsDeleted)),
                    Expression.Constant(false));
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(Expression.Lambda(body, parameter));
            }
        }
    }
}
