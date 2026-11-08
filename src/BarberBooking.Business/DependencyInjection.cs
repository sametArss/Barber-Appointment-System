using System.Reflection;
using FluentValidation;
using BarberBooking.Business.Security;
using BarberBooking.Business.Services;
using BarberBooking.Entities.Common;
using BarberBooking.Shared.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using BarberBooking.Business.Notifications;

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
            services.AddScoped<IServiceManagementService, ServiceManager>();
            services.AddScoped<IScheduleService, ScheduleManager>();
            services.AddScoped<IAppointmentService, AppointmentManager>();
            services.AddScoped<ISearchService, SearchManager>();
            services.AddScoped<IPenaltyService, PenaltyManager>();
            services.AddScoped<ISubscriptionService, SubscriptionManager>();
            services.AddScoped<IReviewService, ReviewManager>();
            services.AddSingleton<IEmailSender, NullEmailSender>();
            services.AddSingleton<ISmsSender, NullSmsSender>();
            services.AddScoped<INotificationService, NotificationManager>();
            services.AddScoped<IReportingService, ReportingManager>();
            services.AddScoped<ICustomerService, CustomerManager>();

            return services;
        }
    }
}