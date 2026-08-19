using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class LinkQuotationsToSales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "QuotationId",
                table: "Sales",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QuotationDetailId",
                table: "SaleDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CustomerId",
                table: "Quotations",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_QuotationId",
                table: "Sales",
                column: "QuotationId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleDetails_QuotationDetailId",
                table: "SaleDetails",
                column: "QuotationDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_Quotations_CustomerId",
                table: "Quotations",
                column: "CustomerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Quotations_Customers_CustomerId",
                table: "Quotations",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SaleDetails_QuotationDetails_QuotationDetailId",
                table: "SaleDetails",
                column: "QuotationDetailId",
                principalTable: "QuotationDetails",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sales_Quotations_QuotationId",
                table: "Sales",
                column: "QuotationId",
                principalTable: "Quotations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Quotations_Customers_CustomerId",
                table: "Quotations");

            migrationBuilder.DropForeignKey(
                name: "FK_SaleDetails_QuotationDetails_QuotationDetailId",
                table: "SaleDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_Sales_Quotations_QuotationId",
                table: "Sales");

            migrationBuilder.DropIndex(
                name: "IX_Sales_QuotationId",
                table: "Sales");

            migrationBuilder.DropIndex(
                name: "IX_SaleDetails_QuotationDetailId",
                table: "SaleDetails");

            migrationBuilder.DropIndex(
                name: "IX_Quotations_CustomerId",
                table: "Quotations");

            migrationBuilder.DropColumn(
                name: "QuotationId",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "QuotationDetailId",
                table: "SaleDetails");

            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "Quotations");
        }
    }
}
