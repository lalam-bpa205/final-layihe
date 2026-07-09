using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartERP.Domain.Entities.Notifications;

namespace SmartERP.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");

        builder.Property(n => n.Title).HasMaxLength(150).IsRequired();
        builder.Property(n => n.Message).HasMaxLength(500).IsRequired();
        builder.Property(n => n.Link).HasMaxLength(200);

        builder.HasIndex(n => new { n.TargetModule, n.Id });
    }
}
