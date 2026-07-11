using System.Text.Json;
using System.Text.Json.Serialization;

namespace SmartERP.API.Serialization;

/// <summary>
/// Sistemdəki bütün DateTime-lar UTC yazılır (DateTime.UtcNow), amma EF-dən
/// Kind=Unspecified kimi gəlir və JSON-da "Z" suffiksi olmadan serializasiya
/// olunurdu — brauzer onları lokal vaxt kimi oxuyurdu. Bu converter yazarkən
/// dəyəri UTC kimi işarələyib ISO-8601 ("...Z") formatında çıxarır.
/// </summary>
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.GetDateTime();

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options) =>
        writer.WriteStringValue(
            DateTime.SpecifyKind(value, DateTimeKind.Utc).ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'"));
}

public class UtcNullableDateTimeConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType == JsonTokenType.Null ? null : reader.GetDateTime();

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value is null)
            writer.WriteNullValue();
        else
            writer.WriteStringValue(
                DateTime.SpecifyKind(value.Value, DateTimeKind.Utc).ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'"));
    }
}
