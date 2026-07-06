using Microsoft.EntityFrameworkCore;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Constants;
using SmartERP.Domain.Entities.Auth;

namespace SmartERP.Infrastructure.Persistence;

/// <summary>
/// İlk işə düşmə zamanı rolları və default SuperAdmin istifadəçisini yaradır.
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context, IPasswordHasher passwordHasher)
    {
        // Rollar
        var existingRoles = await context.Roles.Select(r => r.Name).ToListAsync();
        var missingRoles = RoleNames.All.Except(existingRoles).ToList();

        if (missingRoles.Count > 0)
        {
            context.Roles.AddRange(missingRoles.Select(name => new Role { Name = name }));
            await context.SaveChangesAsync();
        }

        // Default SuperAdmin (yalnız heç bir istifadəçi yoxdursa)
        if (!await context.Users.AnyAsync())
        {
            var superAdminRole = await context.Roles.FirstAsync(r => r.Name == RoleNames.SuperAdmin);

            var admin = new User
            {
                UserName = "admin",
                Email = "admin@smarterp.az",
                PasswordHash = passwordHasher.Hash("Admin123!"),
                FirstName = "Super",
                LastName = "Admin",
                UserRoles = { new UserRole { Role = superAdminRole } }
            };

            context.Users.Add(admin);
            await context.SaveChangesAsync();
        }
    }
}
