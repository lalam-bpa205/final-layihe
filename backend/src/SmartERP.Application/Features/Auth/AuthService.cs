using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Exceptions;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Auth.Dtos;
using SmartERP.Domain.Constants;
using SmartERP.Domain.Entities.Auth;
using SmartERP.Domain.Enums;

namespace SmartERP.Application.Features.Auth;

public class AuthService(
    IUnitOfWork unitOfWork,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    IValidator<RegisterRequest> registerValidator,
    IValidator<LoginRequest> loginValidator,
    IValidator<ChangePasswordRequest> changePasswordValidator) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        await registerValidator.ValidateAndThrowAsync(request, ct);

        var users = unitOfWork.Repository<User>();

        if (await users.AnyAsync(u => u.Email == request.Email, ct))
            throw new ConflictException("Bu email artıq qeydiyyatdan keçib.");

        if (await users.AnyAsync(u => u.UserName == request.UserName, ct))
            throw new ConflictException("Bu istifadəçi adı artıq mövcuddur.");

        // User + rol təyinatı + refresh token — hamısı bir tranzaksiyada.
        // Hər hansı addım uğursuz olarsa (məs. rol tapılmadı) heç nə yazılmır.
        var user = await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var newUser = new User
            {
                UserName = request.UserName,
                Email = request.Email,
                PasswordHash = passwordHasher.Hash(request.Password),
                FirstName = request.FirstName,
                LastName = request.LastName
            };
            await users.AddAsync(newUser, token);

            var employeeRole = await unitOfWork.Repository<Role>()
                .FirstOrDefaultAsync(r => r.Name == RoleNames.Employee, token)
                ?? throw new NotFoundException("Rol", RoleNames.Employee);

            newUser.UserRoles.Add(new UserRole { Role = employeeRole });
            return newUser;
        }, ct);

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        await loginValidator.ValidateAndThrowAsync(request, ct);

        var user = await unitOfWork.Repository<User>().Query()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.ModuleAccesses)
            .FirstOrDefaultAsync(
                u => u.UserName == request.UserNameOrEmail || u.Email == request.UserNameOrEmail, ct);

        // Təhlükəsizlik: "istifadəçi yoxdur" və "şifrə səhvdir" fərqləndirilmir
        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("İstifadəçi adı və ya şifrə yanlışdır.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Hesabınız deaktiv edilib.");

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        var storedToken = await unitOfWork.Repository<RefreshToken>().Query()
            .Include(rt => rt.User).ThenInclude(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(rt => rt.User).ThenInclude(u => u.ModuleAccesses)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken, ct);

        if (storedToken is null || !storedToken.IsActive || !storedToken.User.IsActive)
            throw new UnauthorizedAccessException("Refresh token etibarsızdır.");

        // Rotasiya: köhnə token ləğv edilir, yenisi verilir (oğurlanma halında köhnəsi işləməz)
        var response = await BuildAuthResponseAsync(storedToken.User, ct, saveChanges: false);

        storedToken.RevokedAtUtc = DateTime.UtcNow;
        storedToken.ReplacedByToken = response.RefreshToken;
        await unitOfWork.SaveChangesAsync(ct);

        return response;
    }

    public async Task LogoutAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        var storedToken = await unitOfWork.Repository<RefreshToken>()
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken, ct);

        if (storedToken is { RevokedAtUtc: null })
        {
            storedToken.RevokedAtUtc = DateTime.UtcNow;
            await unitOfWork.SaveChangesAsync(ct);
        }
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        await changePasswordValidator.ValidateAndThrowAsync(request, ct);

        var user = await unitOfWork.Repository<User>().GetByIdAsync(userId, ct)
            ?? throw new NotFoundException("İstifadəçi", userId);

        if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Hazırkı şifrə yanlışdır.");

        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            user.PasswordHash = passwordHasher.Hash(request.NewPassword);

            // Təhlükəsizlik: şifrə dəyişəndə bütün aktiv sessiyalar bağlanır
            var activeTokens = await unitOfWork.Repository<RefreshToken>()
                .ListAsync(rt => rt.UserId == userId && rt.RevokedAtUtc == null, token);

            foreach (var rt in activeTokens)
                rt.RevokedAtUtc = DateTime.UtcNow;
        }, ct);
    }

    public async Task<UserDto> GetMeAsync(int userId, CancellationToken ct = default)
    {
        var user = await unitOfWork.Repository<User>().Query()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.ModuleAccesses)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("İstifadəçi", userId);

        return ToDto(user);
    }

    public async Task AssignRoleAsync(AssignRoleRequest request, CancellationToken ct = default)
    {
        var user = await unitOfWork.Repository<User>().Query()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == request.UserId, ct)
            ?? throw new NotFoundException("İstifadəçi", request.UserId);

        if (user.UserRoles.Any(ur => ur.Role.Name == request.RoleName))
            throw new ConflictException($"İstifadəçinin artıq '{request.RoleName}' rolu var.");

        var role = await unitOfWork.Repository<Role>()
            .FirstOrDefaultAsync(r => r.Name == request.RoleName, ct)
            ?? throw new NotFoundException("Rol", request.RoleName);

        user.UserRoles.Add(new UserRole { Role = role });
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task RemoveRoleAsync(AssignRoleRequest request, CancellationToken ct = default)
    {
        var user = await unitOfWork.Repository<User>().Query()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == request.UserId, ct)
            ?? throw new NotFoundException("İstifadəçi", request.UserId);

        var userRole = user.UserRoles.FirstOrDefault(ur => ur.Role.Name == request.RoleName)
            ?? throw new NotFoundException("İstifadəçi rolu", request.RoleName);

        unitOfWork.Repository<UserRole>().Remove(userRole);
        await unitOfWork.SaveChangesAsync(ct);
    }

    // ---------- Köməkçi metodlar ----------

    private async Task<AuthResponse> BuildAuthResponseAsync(User user, CancellationToken ct, bool saveChanges = true)
    {
        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var modules = GetEffectiveModules(user, roles);

        var (accessToken, expiresAt) = tokenService.CreateAccessToken(user, roles, modules);
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            User = user,
            Token = tokenService.CreateRefreshToken(),
            ExpiresAtUtc = DateTime.UtcNow.AddDays(tokenService.RefreshTokenDays)
        };

        await unitOfWork.Repository<RefreshToken>().AddAsync(refreshToken, ct);
        if (saveChanges)
            await unitOfWork.SaveChangesAsync(ct);

        return new AuthResponse(accessToken, expiresAt, refreshToken.Token, ToDto(user));
    }

    private static UserDto ToDto(User user)
    {
        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        return new UserDto(
            user.Id,
            user.UserName,
            user.Email,
            user.FirstName,
            user.LastName,
            roles,
            GetEffectiveModules(user, roles));
    }

    /// <summary>
    /// Effektiv modul icazələri: açıq təyin edilmiş modullar + rollardan gələnlər.
    /// SuperAdmin/Admin bütün modulları görür.
    /// </summary>
    private static List<string> GetEffectiveModules(User user, List<string> roles)
    {
        var modules = user.ModuleAccesses
            .Select(ma => ma.Module.ToString())
            .ToHashSet();

        if (roles.Contains(RoleNames.HRManager)) modules.Add(nameof(AppModule.Hr));
        if (roles.Contains(RoleNames.WarehouseManager)) modules.Add(nameof(AppModule.Inventory));
        if (roles.Contains(RoleNames.TransportManager)) modules.Add(nameof(AppModule.Transport));
        if (roles.Contains(RoleNames.FinanceManager)) modules.Add(nameof(AppModule.Finance));

        if (roles.Contains(RoleNames.SuperAdmin) || roles.Contains(RoleNames.Admin))
            modules.UnionWith(Enum.GetNames<AppModule>());

        return modules.Order().ToList();
    }
}
