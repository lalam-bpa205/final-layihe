using SmartERP.Application.Common.Interfaces;

namespace SmartERP.Infrastructure.Identity;

public class BcryptPasswordHasher : IPasswordHasher
{
    // WorkFactor=12: hər hash ~250ms — brute-force hücumlarını praktiki mümkünsüz edir
    private const int WorkFactor = 12;

    public string Hash(string password) =>
        BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);

    public bool Verify(string password, string passwordHash) =>
        BCrypt.Net.BCrypt.Verify(password, passwordHash);
}
