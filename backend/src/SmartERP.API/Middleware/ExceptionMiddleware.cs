using System.Text.Json;
using FluentValidation;
using SmartERP.Application.Common.Exceptions;

namespace SmartERP.API.Middleware;

/// <summary>
/// Bütün tutulmamış exception-ları vahid JSON formatında qaytarır.
/// Exception növünə görə düzgün HTTP status kodu seçilir.
/// </summary>
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message, errors) = exception switch
        {
            ValidationException validationEx => (
                StatusCodes.Status400BadRequest,
                "Validasiya xətası.",
                validationEx.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())),

            NotFoundException => (StatusCodes.Status404NotFound, exception.Message, null),
            ConflictException => (StatusCodes.Status409Conflict, exception.Message, null),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Giriş icazəsi yoxdur.", null),

            _ => (StatusCodes.Status500InternalServerError, "Daxili server xətası baş verdi.", null)
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Tutulmamış exception: {Message}", exception.Message);
        else
            logger.LogWarning("İdarə olunan xəta ({StatusCode}): {Message}", statusCode, exception.Message);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;

        var response = new
        {
            success = false,
            statusCode,
            message,
            errors
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonOptions));
    }
}
