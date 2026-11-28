using BarberBooking.API.BackgroundServices;
using BarberBooking.API.Filters;
using BarberBooking.API.Middlewares;
using BarberBooking.Business;
using BarberBooking.DataAccess;
using BarberBooking.DataAccess.Context;
using BarberBooking.DataAccess.Seed;
using BarberBooking.Shared.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// DataAccess & Business Kayıtları
builder.Services.AddDataAccess(builder.Configuration);
builder.Services.AddBusinessServices(builder.Configuration);
builder.Services.AddHostedService<AppointmentReminderBackgroundService>();

// Exception Handling & ProblemDetails
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Health Checks Kaydı (Database Kontrolü ile)
builder.Services.AddHealthChecks()
    .AddDbContextCheck<BarberBookingDbContext>("Database");

// JWT Authentication Kaydı (eksikse sessizce geçme, startup'ta hata fırlat)
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>()
    ?? throw new InvalidOperationException("JwtSettings yapılandırması bulunamadı.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

// Rate Limiting (IP bazlı global + auth endpointleri için sıkı limit)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            success = false,
            message = "Çok fazla istek gönderdiniz. Lütfen kısa bir süre sonra tekrar deneyiniz.",
            statusCode = 429
        }, token);
    };

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var path = httpContext.Request.Path.Value ?? string.Empty;
        var isAuthEndpoint = path.StartsWith("/api/auth/", StringComparison.OrdinalIgnoreCase);

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: isAuthEndpoint ? $"auth:{clientIp}" : $"api:{clientIp}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = isAuthEndpoint ? 30 : 200,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
});

// Controller & Validation Filter Kaydı
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ValidateModelAttribute>();
});

// Varsayılan otomatik ModelState filtresini bizim filter'ımız yönetsin diye kapatıyoruz:
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = true;
});

builder.Services.AddOpenApi();

// CORS yapılandırması (Canlı ortamda appsettings / env üzerinden Cors:AllowedOrigins okunur)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (allowedOrigins == null || allowedOrigins.Length == 0)
{
    allowedOrigins = new[] { "http://localhost:3000", "http://localhost:5173" };
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

var app = builder.Build();

app.UseForwardedHeaders();

// Otomatik Migration ve Seed Veri Yükleme
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<BarberBookingDbContext>();
    await DatabaseSeeder.SeedAsync(dbContext);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options
            .WithTitle("BarberBooking API Docs")
            .WithTheme(ScalarTheme.Moon);
    });
}
app.UseHttpsRedirection();

app.UseCors("AllowFrontend");
app.UseRateLimiter();
// Middlewares
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();

// Authentication her zaman Authorization'dan önce gelmeli
app.UseAuthentication();
app.UseAuthorization();


// Health Check Endpoint'i
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            Status = report.Status.ToString(),
            TotalDuration = report.TotalDuration.TotalMilliseconds + " ms",
            Checks = report.Entries.Select(e => new
            {
                Component = e.Key,
                Status = e.Value.Status.ToString(),
                Description = e.Value.Description,
                Duration = e.Value.Duration.TotalMilliseconds + " ms"
            })
        };
        await context.Response.WriteAsJsonAsync(response);
    }
});

app.MapControllers();

app.Run();