using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HyperKanban.API.Migrations
{
    /// <inheritdoc />
    public partial class AddParentChildWorkflowSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ChildWorkItemIds",
                table: "WorkItems",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ParentWorkItemId",
                table: "WorkItems",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "SwimlaneBoardId",
                table: "WorkItems",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ChildWorkItemIds",
                table: "WorkItems");

            migrationBuilder.DropColumn(
                name: "ParentWorkItemId",
                table: "WorkItems");

            migrationBuilder.DropColumn(
                name: "SwimlaneBoardId",
                table: "WorkItems");
        }
    }
}
