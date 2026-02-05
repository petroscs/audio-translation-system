using System.Text.Json;
using System.Text.Json.Serialization;

namespace Backend.Tests.Helpers;

/// <summary>
/// JSON options for test client deserialization. Matches API serialization (camelCase + string enums).
/// </summary>
public static class TestJsonOptions
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };
}
