using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceOrderInvoicing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "LaborCost",
                table: "ServiceOrders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ServiceOrderId",
                table: "Sales",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_ServiceOrderId",
                table: "Sales",
                column: "ServiceOrderId",
                unique: true,
                filter: "[ServiceOrderId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Sales_ServiceOrders_ServiceOrderId",
                table: "Sales",
                column: "ServiceOrderId",
                principalTable: "ServiceOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Sales_ServiceOrders_ServiceOrderId",
                table: "Sales");

            migrationBuilder.DropIndex(
                name: "IX_Sales_ServiceOrderId",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "LaborCost",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "ServiceOrderId",
                table: "Sales");
        }
    }
}
