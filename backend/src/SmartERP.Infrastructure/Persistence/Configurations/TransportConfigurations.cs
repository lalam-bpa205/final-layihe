using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartERP.Domain.Entities.Transport;

namespace SmartERP.Infrastructure.Persistence.Configurations;

public class VehicleConfiguration : IEntityTypeConfiguration<Vehicle>
{
    public void Configure(EntityTypeBuilder<Vehicle> builder)
    {
        builder.ToTable("Vehicles");

        builder.Property(v => v.PlateNumber).HasMaxLength(20).IsRequired();
        builder.Property(v => v.Brand).HasMaxLength(50).IsRequired();
        builder.Property(v => v.Model).HasMaxLength(50).IsRequired();
        builder.Property(v => v.CapacityKg).HasPrecision(10, 2);

        builder.HasIndex(v => v.PlateNumber).IsUnique();
    }
}

public class DriverConfiguration : IEntityTypeConfiguration<Driver>
{
    public void Configure(EntityTypeBuilder<Driver> builder)
    {
        builder.ToTable("Drivers");

        builder.Property(d => d.LicenseNumber).HasMaxLength(30).IsRequired();
        builder.Property(d => d.LicenseCategories).HasMaxLength(30).IsRequired();

        builder.HasIndex(d => d.LicenseNumber).IsUnique();
        builder.HasIndex(d => d.EmployeeId).IsUnique();

        builder.HasOne(d => d.Employee)
            .WithOne()
            .HasForeignKey<Driver>(d => d.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class DeliveryConfiguration : IEntityTypeConfiguration<Delivery>
{
    public void Configure(EntityTypeBuilder<Delivery> builder)
    {
        builder.ToTable("Deliveries");

        builder.Property(d => d.Number).HasMaxLength(20).IsRequired();
        builder.Property(d => d.CustomerName).HasMaxLength(150).IsRequired();
        builder.Property(d => d.FromAddress).HasMaxLength(300).IsRequired();
        builder.Property(d => d.ToAddress).HasMaxLength(300).IsRequired();
        builder.Property(d => d.CargoDescription).HasMaxLength(500);
        builder.Property(d => d.CargoWeightKg).HasPrecision(10, 2);
        builder.Property(d => d.Note).HasMaxLength(500);

        builder.HasIndex(d => d.Number).IsUnique();
        builder.HasIndex(d => d.Status);

        builder.HasOne(d => d.Vehicle)
            .WithMany(v => v.Deliveries)
            .HasForeignKey(d => d.VehicleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Driver)
            .WithMany(dr => dr.Deliveries)
            .HasForeignKey(d => d.DriverId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class FuelRecordConfiguration : IEntityTypeConfiguration<FuelRecord>
{
    public void Configure(EntityTypeBuilder<FuelRecord> builder)
    {
        builder.ToTable("FuelRecords");

        builder.Property(f => f.Liters).HasPrecision(8, 2);
        builder.Property(f => f.Cost).HasPrecision(10, 2);
        builder.Property(f => f.Note).HasMaxLength(300);

        builder.HasIndex(f => new { f.VehicleId, f.Date });

        builder.HasOne(f => f.Vehicle)
            .WithMany(v => v.FuelRecords)
            .HasForeignKey(f => f.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(f => f.Driver)
            .WithMany()
            .HasForeignKey(f => f.DriverId)
            .OnDelete(DeleteBehavior.SetNull);

        // Mənbə silinsə köçürmə tarixçəsi qalsın
        builder.HasOne(f => f.FuelSource)
            .WithMany(s => s.FuelRecords)
            .HasForeignKey(f => f.FuelSourceId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class FuelSourceConfiguration : IEntityTypeConfiguration<FuelSource>
{
    public void Configure(EntityTypeBuilder<FuelSource> builder)
    {
        builder.ToTable("FuelSources");

        builder.Property(s => s.Name).IsRequired().HasMaxLength(120);
        builder.Property(s => s.Address).HasMaxLength(250);
        builder.Property(s => s.CurrentLiters).HasPrecision(10, 2);
        builder.Property(s => s.CapacityLiters).HasPrecision(10, 2);

        builder.HasIndex(s => s.Name);
    }
}

public class MaintenanceRecordConfiguration : IEntityTypeConfiguration<MaintenanceRecord>
{
    public void Configure(EntityTypeBuilder<MaintenanceRecord> builder)
    {
        builder.ToTable("MaintenanceRecords");

        builder.Property(m => m.Description).HasMaxLength(500).IsRequired();
        builder.Property(m => m.Cost).HasPrecision(10, 2);

        builder.HasIndex(m => new { m.VehicleId, m.Date });

        builder.HasOne(m => m.Vehicle)
            .WithMany(v => v.MaintenanceRecords)
            .HasForeignKey(m => m.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class VehicleLocationConfiguration : IEntityTypeConfiguration<VehicleLocation>
{
    public void Configure(EntityTypeBuilder<VehicleLocation> builder)
    {
        builder.ToTable("VehicleLocations");

        // Track sorğuları (avtomobil üzrə, sıra ilə) sürətli olsun
        builder.HasIndex(l => new { l.VehicleId, l.Sequence });

        // Çatdırılmanın öz izini çəkmək üçün
        builder.HasIndex(l => new { l.DeliveryId, l.Sequence });

        builder.HasOne(l => l.Vehicle)
            .WithMany()
            .HasForeignKey(l => l.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(l => l.Delivery)
            .WithMany()
            .HasForeignKey(l => l.DeliveryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
