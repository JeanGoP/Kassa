using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPreparationOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PreparationOrders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    OrderNumber = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CommercialDocumentReference = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    CustomerId = table.Column<int>(type: "int", nullable: true),
                    RequestedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    RequestedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ChassisNumber = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    EngineNumber = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Plate = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Brand = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Model = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Year = table.Column<int>(type: "int", nullable: true),
                    Mileage = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    ExecutedBy = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    Findings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WarrantyOpened = table.Column<bool>(type: "bit", nullable: false),
                    WarrantyId = table.Column<int>(type: "int", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreparationOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PreparationOrders_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PreparationOrders_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PreparationOrders_Warranties_WarrantyId",
                        column: x => x.WarrantyId,
                        principalTable: "Warranties",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PreparationOrderItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    PreparationOrderId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: true),
                    Reference = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,3)", nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    UnitValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreparationOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PreparationOrderItems_PreparationOrders_PreparationOrderId",
                        column: x => x.PreparationOrderId,
                        principalTable: "PreparationOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PreparationOrderItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrderItems_PreparationOrderId",
                table: "PreparationOrderItems",
                column: "PreparationOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrderItems_ProductId",
                table: "PreparationOrderItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrders_BranchId",
                table: "PreparationOrders",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrders_CustomerId",
                table: "PreparationOrders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrders_OrderNumber",
                table: "PreparationOrders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrders_TenantId_ChassisNumber",
                table: "PreparationOrders",
                columns: new[] { "TenantId", "ChassisNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrders_TenantId_RequestedAt",
                table: "PreparationOrders",
                columns: new[] { "TenantId", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrders_WarrantyId",
                table: "PreparationOrders",
                column: "WarrantyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PreparationOrderItems");

            migrationBuilder.DropTable(
                name: "PreparationOrders");
        }
    }
}
