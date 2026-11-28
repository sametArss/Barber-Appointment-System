using BarberBooking.Shared.Results;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BarberBooking.API.Filters
{
    public class ValidateModelAttribute : ActionFilterAttribute
    {
        public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var errors = new List<string>();

            if (!context.ModelState.IsValid)
            {
                errors.AddRange(context.ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage));
            }

            // FluentValidation validator'larını tüm action DTO argümanları için otomatik çalıştır
            var serviceProvider = context.HttpContext.RequestServices;
            foreach (var arg in context.ActionArguments.Values)
            {
                if (arg == null) continue;
                var validatorType = typeof(IValidator<>).MakeGenericType(arg.GetType());
                if (serviceProvider.GetService(validatorType) is IValidator validator)
                {
                    var validationContext = new ValidationContext<object>(arg);
                    var validationResult = await validator.ValidateAsync(validationContext, context.HttpContext.RequestAborted);
                    if (!validationResult.IsValid)
                    {
                        errors.AddRange(validationResult.Errors.Select(e => e.ErrorMessage));
                    }
                }
            }

            if (errors.Count > 0)
            {
                var response = Result.Fail("Validasyon hatası oluştu.", 400, errors.Distinct().ToList());
                context.Result = new BadRequestObjectResult(response);
                return;
            }

            await next();
        }
    }
}
