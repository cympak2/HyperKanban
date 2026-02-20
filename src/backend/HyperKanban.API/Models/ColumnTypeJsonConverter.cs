using System.Text.Json;
using System.Text.Json.Serialization;

namespace HyperKanban.API.Models;

public class ColumnTypeJsonConverter : JsonConverter<ColumnType>
{
    public override ColumnType Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Number)
        {
            var intValue = reader.GetInt32();
            return intValue switch
            {
                0 => ColumnType.HumanAction,
                1 => ColumnType.AIAgent,
                _ => throw new JsonException($"Unknown ColumnType integer value: {intValue}")
            };
        }

        var value = reader.GetString();
        return value switch
        {
            "Human" or "HumanAction" => ColumnType.HumanAction,
            "AI" or "AIAgent" => ColumnType.AIAgent,
            _ => throw new JsonException($"Unknown ColumnType value: '{value}'")
        };
    }

    public override void Write(Utf8JsonWriter writer, ColumnType value, JsonSerializerOptions options)
    {
        var str = value switch
        {
            ColumnType.HumanAction => "Human",
            ColumnType.AIAgent => "AI",
            _ => throw new JsonException($"Unknown ColumnType value: '{value}'")
        };
        writer.WriteStringValue(str);
    }
}
