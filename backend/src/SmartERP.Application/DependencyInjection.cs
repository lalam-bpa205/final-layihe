using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using SmartERP.Application.Features.Auth;

namespace SmartERP.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddAutoMapper(_ => { }, assembly);
        services.AddValidatorsFromAssembly(assembly);

        services.AddScoped<IAuthService, AuthService>();

        return services;
    }
}
