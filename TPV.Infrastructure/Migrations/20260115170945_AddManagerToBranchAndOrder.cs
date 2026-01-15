using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddManagerToBranchAndOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WorkshopManager",
                table: "ServiceOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManagerName",
                table: "Branches",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WorkshopManager",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "ManagerName",
                table: "Branches");
        }
    }
}
