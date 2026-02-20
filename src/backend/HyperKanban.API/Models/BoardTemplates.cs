namespace HyperKanban.API.Models;

/// <summary>
/// Static definitions for standard workflow board templates
/// </summary>
public static class BoardTemplates
{
    public static BoardTemplate GetProductOwnerTemplate() => new()
    {
        Name = "Product Owner",
        Description = "Product ideation and filtration workflow",
        Type = BoardType.ProductOwner,
        Columns = new List<ColumnTemplate>
        {
            new() { Name = "Idea", Position = 0, Type = ColumnType.HumanAction },
            new() { Name = "Filtration", Position = 1, Type = ColumnType.HumanAction },
            new() { Name = "In Progress", Position = 2, Type = ColumnType.HumanAction, IsDoneState = true },
            new() { Name = "Done", Position = 3, Type = ColumnType.HumanAction, AllowedResolutions = new() { "In Prod", "Declined" } }
        },
        TransitionColumnName = "In Progress", // Column that triggers cross-board transition
        NextBoardType = BoardType.BusinessAnalytics,
        TargetColumnName = "Input" // Target column in next board
    };

    public static BoardTemplate GetBusinessAnalyticsTemplate() => new()
    {
        Name = "Business Analytics",
        Description = "Business analysis and concept development",
        Type = BoardType.BusinessAnalytics,
        Columns = new List<ColumnTemplate>
        {
            new() { Name = "Input", Position = 0, Type = ColumnType.HumanAction },
            new() { Name = "Analysis", Position = 1, Type = ColumnType.HumanAction },
            new() { Name = "Concept", Position = 2, Type = ColumnType.HumanAction },
            new() { Name = "In Dev", Position = 3, Type = ColumnType.HumanAction, IsDoneState = true },
            new() { Name = "Done", Position = 4, Type = ColumnType.HumanAction }
        },
        TransitionColumnName = "In Dev",
        NextBoardType = BoardType.Development,
        TargetColumnName = "Backlog"
    };

    public static BoardTemplate GetDevelopmentTemplate() => new()
    {
        Name = "Development",
        Description = "Software development lifecycle",
        Type = BoardType.Development,
        Columns = new List<ColumnTemplate>
        {
            new() { Name = "Backlog", Position = 0, Type = ColumnType.HumanAction },
            new() { Name = "Planning", Position = 1, Type = ColumnType.HumanAction },
            new() { Name = "Development", Position = 2, Type = ColumnType.HumanAction },
            new() { Name = "Review", Position = 3, Type = ColumnType.HumanAction },
            new() { Name = "In QA", Position = 4, Type = ColumnType.HumanAction, IsDoneState = true },
            new() { Name = "Deployment", Position = 5, Type = ColumnType.HumanAction, IsDoneState = true },
            new() { Name = "Done", Position = 6, Type = ColumnType.HumanAction }
        },
        // Development has two exit paths
        MultipleTransitions = new Dictionary<string, (BoardType, string)>
        {
            ["In QA"] = (BoardType.QA, "Backlog"),
            ["Deployment"] = (BoardType.DevOps, "Backlog")
        }
    };

    public static BoardTemplate GetQATemplate() => new()
    {
        Name = "QA",
        Description = "Quality assurance and testing",
        Type = BoardType.QA,
        Columns = new List<ColumnTemplate>
        {
            new() { Name = "Backlog", Position = 0, Type = ColumnType.HumanAction },
            new() { Name = "In Progress", Position = 1, Type = ColumnType.HumanAction },
            new() { Name = "Done", Position = 2, Type = ColumnType.HumanAction }
        },
        // QA Done returns to Development Deployment
        NextBoardType = BoardType.Development,
        TargetColumnName = "Deployment"
    };

    public static BoardTemplate GetDevOpsTemplate() => new()
    {
        Name = "DevOps",
        Description = "Deployment and infrastructure operations",
        Type = BoardType.DevOps,
        Columns = new List<ColumnTemplate>
        {
            new() { Name = "Backlog", Position = 0, Type = ColumnType.HumanAction },
            new() { Name = "In Progress", Position = 1, Type = ColumnType.HumanAction },
            new() { Name = "Done", Position = 2, Type = ColumnType.HumanAction }
        },
        // DevOps Done completes the workflow (returns to PO Done for resolution)
        NextBoardType = BoardType.ProductOwner,
        TargetColumnName = "Done"
    };

    public static List<BoardTemplate> GetAllTemplates() => new()
    {
        GetProductOwnerTemplate(),
        GetBusinessAnalyticsTemplate(),
        GetDevelopmentTemplate(),
        GetQATemplate(),
        GetDevOpsTemplate()
    };
}

public class BoardTemplate
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public BoardType Type { get; set; }
    public List<ColumnTemplate> Columns { get; set; } = new();
    
    // Single transition configuration
    public string? TransitionColumnName { get; set; }
    public BoardType? NextBoardType { get; set; }
    public string? TargetColumnName { get; set; }
    
    // Multiple transition configuration (for boards with multiple exit points)
    public Dictionary<string, (BoardType TargetBoard, string TargetColumn)>? MultipleTransitions { get; set; }
}

public class ColumnTemplate
{
    public string Name { get; set; } = string.Empty;
    public int Position { get; set; }
    public ColumnType Type { get; set; }
    public bool IsDoneState { get; set; } = false;
    public List<string> AllowedResolutions { get; set; } = new();
    public string? ContainerConfigId { get; set; } // For AI columns
}
