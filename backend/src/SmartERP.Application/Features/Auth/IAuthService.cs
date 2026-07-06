using SmartERP.Application.Features.Auth.Dtos;

namespace SmartERP.Application.Features.Auth;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default);
    Task LogoutAsync(RefreshTokenRequest request, CancellationToken ct = default);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default);
    Task<UserDto> GetMeAsync(int userId, CancellationToken ct = default);
    Task AssignRoleAsync(AssignRoleRequest request, CancellationToken ct = default);
    Task RemoveRoleAsync(AssignRoleRequest request, CancellationToken ct = default);
}
