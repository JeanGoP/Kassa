using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGoodsReceiptAccountingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AccountingExportedAt",
                table: "Purchases",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AccountingReference",
                table: "Purchases",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AccountingStatus",
                table: "Purchases",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.AddColumn<string>(
                name: "CreatedByUserId",
                table: "Purchases",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FreightTaxAmount",
                table: "Purchases",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "FreightTaxRate",
                table: "Purchases",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ItemsSubTotal",
                table: "Purchases",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ItemsTaxAmount",
                table: "Purchases",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "SupplierInvoiceDate",
                table: "Purchases",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountingExportedAt",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "AccountingReference",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "AccountingStatus",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "FreightTaxAmount",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "FreightTaxRate",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "ItemsSubTotal",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "ItemsTaxAmount",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "SupplierInvoiceDate",
                table: "Purchases");
        }
    }
}
