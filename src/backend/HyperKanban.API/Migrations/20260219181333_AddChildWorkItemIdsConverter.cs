using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HyperKanban.API.Migrations
{
    /// <inheritdoc />
    public partial class AddChildWorkItemIdsConverter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Fix any NULL or empty values in all JSON columns before altering column type
            migrationBuilder.Sql("UPDATE WorkItems SET ChildWorkItemIds = '[]' WHERE ChildWorkItemIds IS NULL OR ChildWorkItemIds = ''");
            migrationBuilder.Sql("UPDATE WorkItems SET Comments = '[]' WHERE Comments IS NULL OR Comments = ''");
            migrationBuilder.Sql("UPDATE WorkItems SET Tags = '[]' WHERE Tags IS NULL OR Tags = ''");
            migrationBuilder.Sql("UPDATE WorkItems SET AuditTrail = '[]' WHERE AuditTrail IS NULL OR AuditTrail = ''");
            migrationBuilder.Sql("UPDATE WorkItems SET AiProcessingHistory = '[]' WHERE AiProcessingHistory IS NULL OR AiProcessingHistory = ''");
            migrationBuilder.Sql("UPDATE WorkItems SET BoardHistory = '[]' WHERE BoardHistory IS NULL OR BoardHistory = ''");
            
            migrationBuilder.AlterColumn<string>(
                name: "ChildWorkItemIds",
                table: "WorkItems",
                type: "json",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ChildWorkItemIds",
                table: "WorkItems",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "json")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");
        }
    }
}
