namespace BarberBooking.API.Middlewares
{
    public class CorrelationIdMiddleware
    {
        private const string CorrelationHeader = "X-Correlation-ID";
        private readonly RequestDelegate _next;

        public CorrelationIdMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (!context.Request.Headers.TryGetValue(CorrelationHeader, out var correlationId) || string.IsNullOrWhiteSpace(correlationId))
            {
                correlationId = Guid.NewGuid().ToString("N");
            }

            context.TraceIdentifier = correlationId!;
            context.Response.Headers[CorrelationHeader] = correlationId;

            using (context.RequestServices.GetRequiredService<ILoggerFactory>()
                .CreateLogger("Correlation")
                .BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId.ToString() }))
            {
                await _next(context);
            }
        }
    }
}