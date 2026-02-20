using HyperKanban.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.Text.Json;

namespace HyperKanban.API.Data;

public class HyperKanbanDbContext : DbContext
{
    public HyperKanbanDbContext(DbContextOptions<HyperKanbanDbContext> options)
        : base(options)
    {
    }

    public DbSet<Board> Boards { get; set; }
    public DbSet<WorkItem> WorkItems { get; set; }
    public DbSet<ContainerConfigEntry> ContainerConfigs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Board entity
        modelBuilder.Entity<Board>(entity =>
        {
            entity.ToTable("Boards");
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.Creator).HasMaxLength(200);
            entity.Property(e => e.State).HasConversion<string>();
            entity.Property(e => e.Type).HasConversion<string>();
            entity.Property(e => e.NextBoardId).HasMaxLength(100);
            
            // Store complex objects as JSON
            entity.Property(e => e.Columns)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<Column>>(v, (JsonSerializerOptions?)null) ?? new List<Column>()
                )
                .HasColumnType("json")
                .Metadata.SetValueComparer(new ValueComparer<List<Column>>(
                    (c1, c2) => JsonSerializer.Serialize(c1, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(c2, (JsonSerializerOptions?)null),
                    c => JsonSerializer.Serialize(c, (JsonSerializerOptions?)null).GetHashCode(),
                    c => JsonSerializer.Deserialize<List<Column>>(JsonSerializer.Serialize(c, (JsonSerializerOptions?)null), (JsonSerializerOptions?)null)!));
            
            entity.Property(e => e.Permissions)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<BoardPermissions>(v, (JsonSerializerOptions?)null) ?? new BoardPermissions()
                )
                .HasColumnType("json");
            
            entity.Property(e => e.ColumnTransitionMap)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, string>()
                )
                .HasColumnType("json")
                .Metadata.SetValueComparer(new ValueComparer<Dictionary<string, string>>(
                    (c1, c2) => JsonSerializer.Serialize(c1, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(c2, (JsonSerializerOptions?)null),
                    c => JsonSerializer.Serialize(c, (JsonSerializerOptions?)null).GetHashCode(),
                    c => JsonSerializer.Deserialize<Dictionary<string, string>>(JsonSerializer.Serialize(c, (JsonSerializerOptions?)null), (JsonSerializerOptions?)null)!));

            entity.HasIndex(e => e.Created);
            entity.HasIndex(e => e.Creator);
            entity.HasIndex(e => e.Type);
        });

        // Configure WorkItem entity
        modelBuilder.Entity<WorkItem>(entity =>
        {
            entity.ToTable("WorkItems");
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.BoardId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Description).HasMaxLength(5000);
            entity.Property(e => e.CurrentColumn).HasMaxLength(100);
            entity.Property(e => e.Creator).HasMaxLength(200);
            entity.Property(e => e.State).HasConversion<string>();
            entity.Property(e => e.Priority).HasConversion<string>();
            entity.Property(e => e.PreviousBoardId).HasMaxLength(100);
            entity.Property(e => e.Resolution).HasMaxLength(100);
            
            // Store complex objects as JSON
            entity.Property(e => e.Tags)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => string.IsNullOrWhiteSpace(v) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>()
                )
                .HasColumnType("json")
                .Metadata.SetValueComparer(new ValueComparer<List<string>>(
                    (c1, c2) => c1!.SequenceEqual(c2!),
                    c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                    c => c.ToList()));
            
            entity.Property(e => e.AiProcessingHistory)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => string.IsNullOrWhiteSpace(v) ? new List<AiProcessingRecord>() : JsonSerializer.Deserialize<List<AiProcessingRecord>>(v, (JsonSerializerOptions?)null) ?? new List<AiProcessingRecord>()
                )
                .HasColumnType("json")
                .Metadata.SetValueComparer(new ValueComparer<List<AiProcessingRecord>>(
                    (c1, c2) => JsonSerializer.Serialize(c1, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(c2, (JsonSerializerOptions?)null),
                    c => JsonSerializer.Serialize(c, (JsonSerializerOptions?)null).GetHashCode(),
                    c => JsonSerializer.Deserialize<List<AiProcessingRecord>>(JsonSerializer.Serialize(c, (JsonSerializerOptions?)null), (JsonSerializerOptions?)null)!));
            
            entity.Property(e => e.AuditTrail)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => string.IsNullOrWhiteSpace(v) ? new List<AuditEntry>() : JsonSerializer.Deserialize<List<AuditEntry>>(v, (JsonSerializerOptions?)null) ?? new List<AuditEntry>()
                )
                .HasColumnType("json")
                .Metadata.SetValueComparer(new ValueComparer<List<AuditEntry>>(
                    (c1, c2) => JsonSerializer.Serialize(c1, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(c2, (JsonSerializerOptions?)null),
                    c => JsonSerializer.Serialize(c, (JsonSerializerOptions?)null).GetHashCode(),
                    c => JsonSerializer.Deserialize<List<AuditEntry>>(JsonSerializer.Serialize(c, (JsonSerializerOptions?)null), (JsonSerializerOptions?)null)!));
            
            entity.Property(e => e.BoardHistory)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => string.IsNullOrWhiteSpace(v) ? new List<BoardTransition>() : JsonSerializer.Deserialize<List<BoardTransition>>(v, (JsonSerializerOptions?)null) ?? new List<BoardTransition>()
                )
                .HasColumnType("json")
                .Metadata.SetValueComparer(new ValueComparer<List<BoardTransition>>(
                    (c1, c2) => JsonSerializer.Serialize(c1, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(c2, (JsonSerializerOptions?)null),
                    c => JsonSerializer.Serialize(c, (JsonSerializerOptions?)null).GetHashCode(),
                    c => JsonSerializer.Deserialize<List<BoardTransition>>(JsonSerializer.Serialize(c, (JsonSerializerOptions?)null), (JsonSerializerOptions?)null)!));

            entity.Property(e => e.Comments)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => string.IsNullOrWhiteSpace(v) ? new List<Comment>() : JsonSerializer.Deserialize<List<Comment>>(v, (JsonSerializerOptions?)null) ?? new List<Comment>()
                )
                .HasColumnType("json")
                .Metadata.SetValueComparer(new ValueComparer<List<Comment>>(
                    (c1, c2) => JsonSerializer.Serialize(c1, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(c2, (JsonSerializerOptions?)null),
                    c => JsonSerializer.Serialize(c, (JsonSerializerOptions?)null).GetHashCode(),
                    c => JsonSerializer.Deserialize<List<Comment>>(JsonSerializer.Serialize(c, (JsonSerializerOptions?)null), (JsonSerializerOptions?)null)!));

            entity.Property(e => e.ChildWorkItemIds)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => string.IsNullOrWhiteSpace(v) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>()
                )
                .HasColumnType("json")
                .Metadata.SetValueComparer(new ValueComparer<List<string>>(
                    (c1, c2) => c1!.SequenceEqual(c2!),
                    c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                    c => c.ToList()));

            entity.HasIndex(e => e.BoardId);
            entity.HasIndex(e => e.CurrentColumn);
            entity.HasIndex(e => e.State);
            entity.HasIndex(e => e.Created);
            entity.HasIndex(e => e.Resolution);
        });

        // Configure ContainerConfigEntry entity
        modelBuilder.Entity<ContainerConfigEntry>(entity =>
        {
            entity.ToTable("ContainerConfigs");
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.Version).HasMaxLength(50);
            entity.Property(e => e.Image).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Status).HasConversion<string>();
            
            // Store complex objects as JSON
            entity.Property(e => e.Capabilities)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => string.IsNullOrWhiteSpace(v) ? new ContainerCapabilities() : JsonSerializer.Deserialize<ContainerCapabilities>(v, (JsonSerializerOptions?)null) ?? new ContainerCapabilities()
                )
                .HasColumnType("json");
            
            entity.Property(e => e.Metrics)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => string.IsNullOrWhiteSpace(v) ? new ContainerMetrics() : JsonSerializer.Deserialize<ContainerMetrics>(v, (JsonSerializerOptions?)null) ?? new ContainerMetrics()
                )
                .HasColumnType("json");

            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.Status);
        });
    }
}
