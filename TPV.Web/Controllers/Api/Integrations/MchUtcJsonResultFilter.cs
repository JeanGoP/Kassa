using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace TPV.Web.Controllers.Api.Integrations
{
    public sealed class MchUtcJsonResultFilter : IAsyncResultFilter
    {
        private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

        public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
        {
            if (context.Result is ObjectResult objectResult)
            {
                context.Result = new ContentResult
                {
                    Content = JsonSerializer.Serialize(objectResult.Value, JsonOptions),
                    ContentType = "application/json; charset=utf-8",
                    StatusCode = objectResult.StatusCode
                };
            }

            await next();
        }

        private static JsonSerializerOptions CreateJsonOptions()
        {
            var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
            options.Converters.Add(new UtcDateTimeConverter());
            options.Converters.Add(new UtcDateTimeOffsetConverter());
            return options;
        }

        private sealed class UtcDateTimeConverter : JsonConverter<DateTime>
        {
            public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
                DateTime.Parse(reader.GetString()!, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);

            public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
            {
                var utc = value.Kind switch
                {
                    DateTimeKind.Utc => value,
                    DateTimeKind.Local => value.ToUniversalTime(),
                    _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
                };
                writer.WriteStringValue(utc.ToString("O", CultureInfo.InvariantCulture));
            }
        }

        private sealed class UtcDateTimeOffsetConverter : JsonConverter<DateTimeOffset>
        {
            public override DateTimeOffset Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
                DateTimeOffset.Parse(reader.GetString()!, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);

            public override void Write(Utf8JsonWriter writer, DateTimeOffset value, JsonSerializerOptions options) =>
                writer.WriteStringValue(value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture));
        }
    }
}
