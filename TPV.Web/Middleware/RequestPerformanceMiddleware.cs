using System.Diagnostics;

namespace TPV.Web.Middleware;

public sealed class RequestPerformanceMiddleware
{
    private const int SlowRequestThresholdMilliseconds = 1500;
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestPerformanceMiddleware> _logger;

    public RequestPerformanceMiddleware(
        RequestDelegate next,
        ILogger<RequestPerformanceMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["Server-Timing"] = $"app;dur={stopwatch.Elapsed.TotalMilliseconds:F0}";
            return Task.CompletedTask;
        });

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            if (stopwatch.ElapsedMilliseconds >= SlowRequestThresholdMilliseconds)
            {
                _logger.LogWarning(
                    "Solicitud lenta {Method} {Path} respondio {StatusCode} en {ElapsedMilliseconds} ms",
                    context.Request.Method,
                    context.Request.Path,
                    context.Response.StatusCode,
                    stopwatch.ElapsedMilliseconds);
            }
        }
    }
}
