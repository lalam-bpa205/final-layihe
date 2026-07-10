using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SmartERP.API.Hubs;

/// <summary>
/// Real-time çat. Mesaj göndərmə REST ilə edilir (DB-yə yazılır),
/// hub isə qarşı tərəfə anlıq çatdırılma üçündür.
/// SignalR istifadəçini NameIdentifier claim-i ilə tanıyır —
/// Clients.User("5") həmin istifadəçinin BÜTÜN açıq tablarına göndərir.
/// </summary>
[Authorize]
public class ChatHub : Hub
{
}
