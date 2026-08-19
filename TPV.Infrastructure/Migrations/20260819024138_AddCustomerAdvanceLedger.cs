using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerAdvanceLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AmountReceived",
                table: "Sales",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ChangeAmount",
                table: "Sales",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CustomerAdvanceApplied",
                table: "Sales",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CustomerAdvanceCreated",
                table: "Sales",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "CustomerAdvanceMovements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    SaleId = table.Column<int>(type: "int", nullable: true),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MovementType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PaymentMethod = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Reference = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerAdvanceMovements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomerAdvanceMovements_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CustomerAdvanceMovements_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CustomerAdvanceMovements_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAdvanceMovements_BranchId",
                table: "CustomerAdvanceMovements",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAdvanceMovements_CustomerId",
                table: "CustomerAdvanceMovements",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAdvanceMovements_SaleId",
                table: "CustomerAdvanceMovements",
                column: "SaleId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAdvanceMovements_TenantId_CustomerId_Date",
                table: "CustomerAdvanceMovements",
                columns: new[] { "TenantId", "CustomerId", "Date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomerAdvanceMovements");

            migrationBuilder.DropColumn(
                name: "AmountReceived",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "ChangeAmount",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "CustomerAdvanceApplied",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "CustomerAdvanceCreated",
                table: "Sales");
        }
    }
}
