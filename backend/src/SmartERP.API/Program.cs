using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Serilog;
using SmartERP.API.Hubs;
using SmartERP.API.Middleware;
using SmartERP.API.Services;
using SmartERP.Application;
using SmartERP.Application.Common.Interfaces;
using SmartERP.Domain.Constants;
using SmartERP.Domain.Enums;
using SmartERP.Infrastructure;
using SmartERP.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// QuestPDF Community lisenziyası — <$1M dövriyyəli təşkilatlar/fərdlər üçün pulsuz
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// ---------- Serilog ----------
builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration));

// ---------- Servislər ----------
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // UTC tarixlər "Z" suffiksi ilə getsin — brauzer düzgün lokala çevirsin
        options.JsonSerializerOptions.Converters.Add(new SmartERP.API.Serialization.UtcDateTimeConverter());
        options.JsonSerializerOptions.Converters.Add(new SmartERP.API.Serialization.UtcNullableDateTimeConverter());
    });
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<INotificationService, SignalRNotificationService>();
builder.Services.AddSignalR();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// ---------- JWT Autentifikasiya ----------
var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSection["SecretKey"]!)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        // SignalR WebSocket bağlantısında token header-də deyil, query-də gəlir
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

// Hər modul üçün policy: SuperAdmin/Admin hər şeyi görür,
// digərləri yalnız "module" claim-i olduqda daxil ola bilir
builder.Services.AddAuthorization(options =>
{
    foreach (var module in Enum.GetNames<AppModule>())
    {
        options.AddPolicy($"Module:{module}", policy =>
            policy.RequireAssertion(ctx =>
                ctx.User.IsInRole(RoleNames.SuperAdmin) ||
                ctx.User.IsInRole(RoleNames.Admin) ||
                ctx.User.HasClaim("module", module)));
    }
});

// ---------- Swagger (JWT dəstəyi ilə) ----------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "SmartERP API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT token daxil edin (Bearer prefiksi olmadan)."
    });

    options.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer", doc), [] }
    });
});

// ---------- CORS ----------
// İcazə verilən origin-lər konfiqurasiyadan gəlir (Cors:AllowedOrigins).
// Təyin olunmayıbsa React dev serverinə düşür — beləliklə Docker/prod
// mühiti öz origin-ini ötürə bilir, lokal iş isə əvvəlki kimi qalır.
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ---------- Rate limiting (login brute-force qoruması) ----------
// Eyni IP-dən dəqiqədə 5 giriş cəhdi — parol təxmin etmə hücumunu ləngidir.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1)
            }));
});

var app = builder.Build();

// ---------- Production sirr mühafizəsi ----------
// Placeholder JWT açarı ilə Production-da işə düşmək token saxtalaşdırmasına
// imkan verərdi — real açar (env: Jwt__SecretKey) tələb olunur.
var jwtKey = jwtSection["SecretKey"];
if (app.Environment.IsProduction() &&
    (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.StartsWith("CHANGE_ME")))
{
    throw new InvalidOperationException(
        "Production mühitində real Jwt:SecretKey təyin edilməlidir (ən azı 64 simvol). " +
        "Env dəyişəni: Jwt__SecretKey");
}

// ---------- Migration + Seed ----------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DataSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher>());

    // Nümayiş datası — yalnız konfiqurasiyada aktivdirsə və baza hələ doldurulmayıbsa
    if (builder.Configuration.GetValue("DemoData:Enabled", false))
    {
        await DemoDataSeeder.SeedAsync(
            db,
            scope.ServiceProvider.GetRequiredService<
                SmartERP.Infrastructure.Persistence.Interceptors.AuditInterceptor>());
    }

    // GPS izi olmayan avtomobillər üçün ilkin simulyasiya
    await scope.ServiceProvider
        .GetRequiredService<SmartERP.Application.Features.Transport.Gps.IVehicleGpsService>()
        .SeedMissingAsync();
}

// ---------- Pipeline ----------
app.UseMiddleware<ExceptionMiddleware>();
app.UseSerilogRequestLogging();

// Təhlükəsizlik başlıqları — MIME-sniffing, clickjacking və referrer sızmasına qarşı
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<ChatHub>("/hubs/chat");

app.Run();
