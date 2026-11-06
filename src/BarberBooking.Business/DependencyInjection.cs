using System.Reflection;
using FluentValidation;
using BarberBooking.Business.Security;
using BarberBooking.Business.Services;
using BarberBooking.Entities.Common;
using BarberBooking.Shared.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BarberBooking.Business
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddBusinessServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<JwtSettings>(configuration.GetSection("JwtSettings"));

            services.AddHttpContextAccessor();
            services.AddScoped<ICurrentTenantService, CurrentTenantService>();
            services.AddSingleton<IPasswordHasher, PasswordHasher>();
            services.AddScoped<ITokenService, TokenService>();
            services.AddScoped<IAuthService, AuthManager>();
            services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
            services.AddScoped<IBusinessService, BusinessManager>();
            services.AddScoped<IStaffService, StaffManager>();


            return services;
        }
    }
}