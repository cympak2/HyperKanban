using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HyperKanban.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiBoardSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BoardHistory",
                table: "WorkItems",
                type: "json",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PreviousBoardId",
                table: "WorkItems",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Resolution",
                table: "WorkItems",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ColumnTransitionMap",
                table: "Boards",
                type: "json",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "NextBoardId",
                table: "Boards",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Boards",
                type: "varchar(255)",
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_Resolution",
                table: "WorkItems",
                column: "Resolution");

            migrationBuilder.CreateIndex(
                name: "IX_Boards_Type",
                table: "Boards",
                column: "Type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkItems_Resolution",
                table: "WorkItems");

            migrationBuilder.DropIndex(
                name: "IX_Boards_Type",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "BoardHistory",
                table: "WorkItems");

            migrationBuilder.DropColumn(
                name: "PreviousBoardId",
                table: "WorkItems");

            migrationBuilder.DropColumn(
                name: "Resolution",
                table: "WorkItems");

            migrationBuilder.DropColumn(
                name: "ColumnTransitionMap",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "NextBoardId",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Boards");
        }
    }
}
