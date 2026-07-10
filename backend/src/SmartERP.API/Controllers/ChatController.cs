using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SmartERP.API.Hubs;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Entities.Auth;
using SmartERP.Domain.Entities.Chat;

namespace SmartERP.API.Controllers;

public record SendMessageRequest(string Text);

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    IHubContext<ChatHub> chatHub) : ControllerBase
{
    /// <summary>Yazışmaq mümkün olan istifadəçilər + oxunmamış mesaj sayları.</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(CancellationToken ct)
    {
        var myId = currentUser.UserId!.Value;

        var users = await unitOfWork.Repository<User>().Query()
            .Where(u => u.Id != myId && u.IsActive)
            .OrderBy(u => u.FirstName)
            .Select(u => new { u.Id, u.UserName, u.FirstName, u.LastName })
            .ToListAsync(ct);

        var unread = await unitOfWork.Repository<ChatMessage>().Query()
            .Where(m => m.ReceiverUserId == myId && !m.IsRead)
            .GroupBy(m => m.SenderUserId)
            .Select(g => new { SenderId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SenderId, x => x.Count, ct);

        return Ok(users.Select(u => new
        {
            u.Id,
            u.UserName,
            FullName = $"{u.FirstName} {u.LastName}",
            UnreadCount = unread.GetValueOrDefault(u.Id)
        }));
    }

    /// <summary>Ümumi oxunmamış mesaj sayı (header nişanı üçün).</summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken ct)
    {
        var count = await unitOfWork.Repository<ChatMessage>()
            .CountAsync(m => m.ReceiverUserId == currentUser.UserId!.Value && !m.IsRead, ct);
        return Ok(new { count });
    }

    /// <summary>İki nəfər arasındakı söhbət. Açılan kimi gələn mesajlar oxunmuş sayılır.</summary>
    [HttpGet("{userId:int}/messages")]
    public async Task<IActionResult> GetConversation(int userId, CancellationToken ct)
    {
        var myId = currentUser.UserId!.Value;
        var repo = unitOfWork.Repository<ChatMessage>();

        var messages = await repo.Query()
            .Where(m =>
                (m.SenderUserId == myId && m.ReceiverUserId == userId) ||
                (m.SenderUserId == userId && m.ReceiverUserId == myId))
            .OrderBy(m => m.Id)
            .Take(200)
            .Select(m => new
            {
                m.Id,
                m.SenderUserId,
                m.Text,
                m.CreatedDate,
                IsMine = m.SenderUserId == myId
            })
            .ToListAsync(ct);

        // Gələnləri oxunmuş kimi işarələ
        var unreadIncoming = await repo.ListAsync(
            m => m.SenderUserId == userId && m.ReceiverUserId == myId && !m.IsRead, ct);
        if (unreadIncoming.Count > 0)
        {
            foreach (var m in unreadIncoming) m.IsRead = true;
            await unitOfWork.SaveChangesAsync(ct);
        }

        return Ok(messages);
    }

    /// <summary>Mesaj göndər: DB-yə yazılır və SignalR ilə hər iki tərəfə çatdırılır.</summary>
    [HttpPost("{userId:int}/messages")]
    public async Task<IActionResult> Send(int userId, SendMessageRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            throw new ConflictException("Mesaj boş ola bilməz.");
        if (request.Text.Length > 1000)
            throw new ConflictException("Mesaj 1000 simvoldan uzun ola bilməz.");

        var myId = currentUser.UserId!.Value;
        if (userId == myId)
            throw new ConflictException("Özünüzə mesaj göndərə bilməzsiniz.");

        var receiver = await unitOfWork.Repository<User>()
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive, ct)
            ?? throw new NotFoundException("İstifadəçi", userId);

        var message = new ChatMessage
        {
            SenderUserId = myId,
            ReceiverUserId = receiver.Id,
            Text = request.Text.Trim()
        };
        await unitOfWork.Repository<ChatMessage>().AddAsync(message, ct);
        await unitOfWork.SaveChangesAsync(ct);

        var payload = new
        {
            message.Id,
            SenderUserId = myId,
            SenderName = currentUser.UserName,
            ReceiverUserId = receiver.Id,
            message.Text,
            message.CreatedDate
        };

        // Qəbul edənin bütün açıq tablarına + göndərənin digər tablarına
        await chatHub.Clients.Users(userId.ToString(), myId.ToString())
            .SendAsync("chatMessage", payload, ct);

        return Ok(payload);
    }
}
