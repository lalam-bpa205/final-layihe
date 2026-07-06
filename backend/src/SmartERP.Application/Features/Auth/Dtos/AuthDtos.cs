namespace SmartERP.Application.Features.Auth.Dtos;

public record RegisterRequest(
    string UserName,
    string Email,
    string Password,
    string FirstName,
    string LastName);

public record LoginRequest(string UserNameOrEmail, string Password);

public record RefreshTokenRequest(string RefreshToken);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record AssignRoleRequest(int UserId, string RoleName);

public record UserDto(
    int Id,
    string UserName,
    string Email,
    string FirstName,
    string LastName,
    List<string> Roles);

public record AuthResponse(
    string AccessToken,
    DateTime ExpiresAtUtc,
    string RefreshToken,
    UserDto User);
