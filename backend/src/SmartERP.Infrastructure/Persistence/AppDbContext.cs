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

    public DbSet<Domain.Entities.Inventory.Category> Categories => Set<Domain.Entities.Inventory.Category>();
    public DbSet<Domain.Entities.Inventory.Warehouse> Warehouses => Set<Domain.Entities.Inventory.Warehouse>();
    public DbSet<Domain.Entities.Inventory.Product> Products => Set<Domain.Entities.Inventory.Product>();
    public DbSet<Domain.Entities.Inventory.StockMovement> StockMovements => Set<Domain.Entities.Inventory.StockMovement>();

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
