using System.Text;
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

// ---------- CORS (React dev serveri üçün) ----------
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

// ---------- Migration + Seed ----------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DataSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher>());
}

// ---------- Pipeline ----------
app.UseMiddleware<ExceptionMiddleware>();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<ChatHub>("/hubs/chat");

app.Run();
