using SmartERP.Domain.Common;
using SmartERP.Domain.Entities.Auth;

namespace SmartERP.Domain.Entities.Chat;

public class ChatMessage : BaseEntity
{
    public int SenderUserId { get; set; }
    public User SenderUser { get; set; } = null!;

    public int ReceiverUserId { get; set; }
    public User ReceiverUser { get; set; } = null!;

    public string Text { get; set; } = null!;
    public bool IsRead { get; set; }
}
