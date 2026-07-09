using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartERP.Domain.Entities.Finance;

namespace SmartERP.Infrastructure.Persistence.Configurations;

public class TransactionCategoryConfiguration : IEntityTypeConfiguration<TransactionCategory>
{
    public void Configure(EntityTypeBuilder<TransactionCategory> builder)
    {
        builder.ToTable("TransactionCategories");

        builder.Property(c => c.Name).HasMaxLength(100).IsRequired();

        // Eyni tip daxilində ad unikaldır (gəlirdə də, xərcdə də "Digər" ola bilər)
        builder.HasIndex(c => new { c.Name, c.Type }).IsUnique();
    }
}

public class FinanceTransactionConfiguration : IEntityTypeConfiguration<FinanceTransaction>
{
    public void Configure(EntityTypeBuilder<FinanceTransaction> builder)
    {
        builder.ToTable("FinanceTransactions");

        builder.Property(t => t.Amount).HasPrecision(14, 2);
        builder.Property(t => t.Description).HasMaxLength(500);

        builder.HasIndex(t => t.Date);
        builder.HasIndex(t => new { t.Type, t.Date });

        builder.HasOne(t => t.Category)
            .WithMany(c => c.Transactions)
            .HasForeignKey(t => t.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Invoice)
            .WithMany()
            .HasForeignKey(t => t.InvoiceId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class BudgetConfiguration : IEntityTypeConfiguration<Budget>
{
    public void Configure(EntityTypeBuilder<Budget> builder)
    {
        builder.ToTable("Budgets");

        builder.Property(b => b.LimitAmount).HasPrecision(14, 2);

        // Bir ay üçün bir kateqoriyaya yalnız bir büdcə
        builder.HasIndex(b => new { b.Year, b.Month, b.CategoryId }).IsUnique();

        builder.HasOne(b => b.Category)
            .WithMany(c => c.Budgets)
            .HasForeignKey(b => b.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.ToTable("Invoices");

        builder.Property(i => i.Number).HasMaxLength(20).IsRequired();
        builder.Property(i => i.CustomerName).HasMaxLength(150).IsRequired();
        builder.Property(i => i.TotalAmount).HasPrecision(14, 2);
        builder.Property(i => i.Note).HasMaxLength(500);

        builder.HasIndex(i => i.Number).IsUnique();
        builder.HasIndex(i => i.Status);
    }
}

public class InvoiceItemConfiguration : IEntityTypeConfiguration<InvoiceItem>
{
    public void Configure(EntityTypeBuilder<InvoiceItem> builder)
    {
        builder.ToTable("InvoiceItems");

        builder.Property(i => i.Description).HasMaxLength(300).IsRequired();
        builder.Property(i => i.Quantity).HasPrecision(10, 2);
        builder.Property(i => i.UnitPrice).HasPrecision(12, 2);
        builder.Property(i => i.LineTotal).HasPrecision(14, 2);

        builder.HasOne(i => i.Invoice)
            .WithMany(inv => inv.Items)
            .HasForeignKey(i => i.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments");

        builder.Property(p => p.Amount).HasPrecision(14, 2);
        builder.Property(p => p.Note).HasMaxLength(300);

        builder.HasOne(p => p.Invoice)
            .WithMany(i => i.Payments)
            .HasForeignKey(p => p.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
