using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceOrderWorkProductId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProductId",
                table: "ServiceOrderWorks",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Products",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrderWorks_ProductId",
                table: "ServiceOrderWorks",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceOrderWorks_Products_ProductId",
                table: "ServiceOrderWorks",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ServiceOrderWorks_Products_ProductId",
                table: "ServiceOrderWorks");

            migrationBuilder.DropIndex(
                name: "IX_ServiceOrderWorks_ProductId",
                table: "ServiceOrderWorks");

            migrationBuilder.DropColumn(
                name: "ProductId",
                table: "ServiceOrderWorks");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Products");
        }
    }
}
