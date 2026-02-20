using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HyperKanban.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCommentsSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Comments",
                table: "WorkItems",
                type: "json",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Comments",
                table: "WorkItems");
        }
    }
}
