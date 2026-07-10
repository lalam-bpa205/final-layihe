using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartERP.Domain.Entities.Audit;
using SmartERP.Domain.Entities.Chat;

namespace SmartERP.Infrastructure.Persistence.Configurations;

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.ToTable("ChatMessages");

        builder.Property(m => m.Text).HasMaxLength(1000).IsRequired();

        // Söhbət tarixçəsi sorğusu üçün indeks
        builder.HasIndex(m => new { m.SenderUserId, m.ReceiverUserId, m.Id });
        builder.HasIndex(m => new { m.ReceiverUserId, m.IsRead });

        builder.HasOne(m => m.SenderUser)
            .WithMany()
            .HasForeignKey(m => m.SenderUserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.ReceiverUser)
            .WithMany()
            .HasForeignKey(m => m.ReceiverUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");

        builder.Property(a => a.UserName).HasMaxLength(50).IsRequired();
        builder.Property(a => a.Action).HasMaxLength(20).IsRequired();
        builder.Property(a => a.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(a => a.Changes).HasColumnType("longtext");

        builder.HasIndex(a => a.CreatedAtUtc);
        builder.HasIndex(a => new { a.EntityType, a.EntityId });
    }
}
