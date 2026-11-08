using System.Diagnostics;
using BarberBooking.Shared.DTOs.Common;
using BarberBooking.Shared.Exceptions;
using Microsoft.AspNetCore.Diagnostics;

namespace BarberBooking.API.Middlewares
{
    public class GlobalExceptionHandler : IExceptionHandler
    {
        private readonly ILogger<GlobalExceptionHandler> _logger;
        private readonly IHostEnvironment _env;

        public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment env)
        {
            _logger = logger;
            _env = env;
        }

        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;

            var (statusCode, message, validationErrors) = exception switch
            {
                ValidationAppException valEx => (valEx.StatusCode, valEx.Message, (IDictionary<string, string[]>?)valEx.Errors),
                BaseCustomException customEx => (customEx.StatusCode, customEx.Message, null),
                UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Oturum açmanız veya geçerli bir yetkilendirme sağlamanız gerekiyor.", null),
                KeyNotFoundException => (StatusCodes.Status404NotFound, "İstenen kaynak bulunamadı.", null),
                _ => (StatusCodes.Status500InternalServerError, "Sunucu tarafında beklenmedik bir hata oluştu.", null)
            };

            if (statusCode == StatusCodes.Status500InternalServerError)
            {
                _logger.LogError(exception, "[FATAL] İşlenmeyen sunucu hatası. TraceId: {TraceId}, Path: {Path}", traceId, httpContext.Request.Path);
            }
            else
            {
                _logger.LogWarning("[WARN] İstemci/İş kuralı hatası. StatusCode: {StatusCode}, Mesaj: {Message}, TraceId: {TraceId}", statusCode, message, traceId);
            }

            var response = new ErrorResponseDto
            {
                Success = false,
                StatusCode = statusCode,
                Message = message,
                Details = _env.IsDevelopment() ? exception.Demystify().ToString() : null,
                TraceId = traceId,
                ValidationErrors = validationErrors
            };

            httpContext.Response.StatusCode = statusCode;
            httpContext.Response.ContentType = "application/json";

            await httpContext.Response.WriteAsJsonAsync(response, cancellationToken);
            return true;
        }
    }

    internal static class ExceptionExtensions
    {
        public static Exception Demystify(this Exception ex) => ex;
    }
}