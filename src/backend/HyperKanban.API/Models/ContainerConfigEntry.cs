using System.Text.Json.Serialization;

namespace HyperKanban.API.Models;

/// <summary>
/// Container configuration registry entry for AI agent containers
/// </summary>
public class ContainerConfigEntry
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0";
    public string Image { get; set; } = string.Empty; // e.g., "hyperkanban.azurecr.io/idea-analyzer:v1.0"
    public int DefaultTimeoutSeconds { get; set; } = 300;
    public ContainerCapabilities Capabilities { get; set; } = new();
    public ContainerStatus Status { get; set; } = ContainerStatus.Active;
    public DateTime Created { get; set; } = DateTime.UtcNow;
    public DateTime? LastTested { get; set; }
    public ContainerMetrics Metrics { get; set; } = new();
}

public class ContainerCapabilities
{
    public string Category { get; set; } = string.Empty; // e.g., "analysis", "requirements", "technical"
    public List<string> SupportedInputTypes { get; set; } = new();
    public List<string> SupportedOutputTypes { get; set; } = new();
    public string? ExpectedInputSchema { get; set; } // JSON schema
    public string? ExpectedOutputSchema { get; set; } // JSON schema
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ContainerStatus
{
    Active,
    Deprecated,
    Testing,
    Disabled
}

public class ContainerMetrics
{
    public int TotalExecutions { get; set; }
    public int SuccessfulExecutions { get; set; }
    public int FailedExecutions { get; set; }
    public double AverageExecutionTimeSeconds { get; set; }
    public double SuccessRate => TotalExecutions > 0 ? (double)SuccessfulExecutions / TotalExecutions : 0;
}
