using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartERP.Domain.Entities.Sales;

namespace SmartERP.Infrastructure.Persistence.Configurations;

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("Customers");

        builder.Property(c => c.Name).HasMaxLength(150).IsRequired();
        builder.Property(c => c.ContactName).HasMaxLength(100);
        builder.Property(c => c.Phone).HasMaxLength(20);
        builder.Property(c => c.Email).HasMaxLength(100);
        builder.Property(c => c.Address).HasMaxLength(300);

        builder.HasIndex(c => c.Name).IsUnique();
    }
}

public class SupplierConfiguration : IEntityTypeConfiguration<Supplier>
{
    public void Configure(EntityTypeBuilder<Supplier> builder)
    {
        builder.ToTable("Suppliers");

        builder.Property(s => s.Name).HasMaxLength(150).IsRequired();
        builder.Property(s => s.ContactName).HasMaxLength(100);
        builder.Property(s => s.Phone).HasMaxLength(20);
        builder.Property(s => s.Email).HasMaxLength(100);
        builder.Property(s => s.Address).HasMaxLength(300);

        builder.HasIndex(s => s.Name).IsUnique();
    }
}

public class SalesOrderConfiguration : IEntityTypeConfiguration<SalesOrder>
{
    public void Configure(EntityTypeBuilder<SalesOrder> builder)
    {
        builder.ToTable("SalesOrders");

        builder.Property(o => o.Number).HasMaxLength(20).IsRequired();
        builder.Property(o => o.TotalAmount).HasPrecision(14, 2);
        builder.Property(o => o.Note).HasMaxLength(500);

        builder.HasIndex(o => o.Number).IsUnique();
        builder.HasIndex(o => o.Status);

        builder.HasOne(o => o.Customer)
            .WithMany(c => c.SalesOrders)
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(o => o.Warehouse)
            .WithMany()
            .HasForeignKey(o => o.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(o => o.Invoice)
            .WithMany()
            .HasForeignKey(o => o.InvoiceId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class SalesOrderItemConfiguration : IEntityTypeConfiguration<SalesOrderItem>
{
    public void Configure(EntityTypeBuilder<SalesOrderItem> builder)
    {
        builder.ToTable("SalesOrderItems");

        builder.Property(i => i.Quantity).HasPrecision(12, 3);
        builder.Property(i => i.UnitPrice).HasPrecision(12, 2);
        builder.Property(i => i.LineTotal).HasPrecision(14, 2);

        builder.HasOne(i => i.SalesOrder)
            .WithMany(o => o.Items)
            .HasForeignKey(i => i.SalesOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class PurchaseOrderConfiguration : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        builder.ToTable("PurchaseOrders");

        builder.Property(o => o.Number).HasMaxLength(20).IsRequired();
        builder.Property(o => o.TotalAmount).HasPrecision(14, 2);
        builder.Property(o => o.Note).HasMaxLength(500);

        builder.HasIndex(o => o.Number).IsUnique();
        builder.HasIndex(o => o.Status);

        builder.HasOne(o => o.Supplier)
            .WithMany(s => s.PurchaseOrders)
            .HasForeignKey(o => o.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(o => o.Warehouse)
            .WithMany()
            .HasForeignKey(o => o.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class PurchaseOrderItemConfiguration : IEntityTypeConfiguration<PurchaseOrderItem>
{
    public void Configure(EntityTypeBuilder<PurchaseOrderItem> builder)
    {
        builder.ToTable("PurchaseOrderItems");

        builder.Property(i => i.Quantity).HasPrecision(12, 3);
        builder.Property(i => i.UnitPrice).HasPrecision(12, 2);
        builder.Property(i => i.LineTotal).HasPrecision(14, 2);

        builder.HasOne(i => i.PurchaseOrder)
            .WithMany(o => o.Items)
            .HasForeignKey(i => i.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
