using SmartERP.Domain.Entities.Auth;

namespace SmartERP.Application.Common.Interfaces;

public interface ITokenService
{
    (string AccessToken, DateTime ExpiresAtUtc) CreateAccessToken(User user, IReadOnlyCollection<string> roles);

    /// <summary>Kriptoqrafik təsadüfi refresh token yaradır.</summary>
    string CreateRefreshToken();

    int RefreshTokenDays { get; }
}
