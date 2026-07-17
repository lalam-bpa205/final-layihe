using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Application.Features.Ai;
using SmartERP.Application.Features.Reports;
using SmartERP.Infrastructure.Ai;
using SmartERP.Infrastructure.Identity;
using SmartERP.Infrastructure.Reports;
using SmartERP.Infrastructure.Persistence;
using SmartERP.Infrastructure.Persistence.Interceptors;
using SmartERP.Infrastructure.Persistence.Repositories;

namespace SmartERP.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<AuditInterceptor>();

        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            var connectionString = configuration.GetConnectionString("Default")
                ?? throw new InvalidOperationException("'Default' connection string tapılmadı.");

            options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString),
                       // Bir neçə kolleksiya yükləyən sorğular ayrı-ayrı SQL kimi icra olunsun —
                       // tək sorğuda JOIN kartezian partlayışına və şişmiş nəticəyə səbəb olurdu.
                       // Səhifələnən sorğular OrderBy işlətdiyi üçün split nəticələr determinstikdir.
                       mySql => mySql.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery))
                   .AddInterceptors(sp.GetRequiredService<AuditInterceptor>());
        });

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IAuditLogReader, AuditLogReader>();

        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();

        services.AddScoped<IReportService, ExcelReportService>();

        services.Configure<OpenAiSettings>(configuration.GetSection(OpenAiSettings.SectionName));
        services.AddHttpClient<IAiAssistantService, OpenAiAssistantService>();

        return services;
    }
}
