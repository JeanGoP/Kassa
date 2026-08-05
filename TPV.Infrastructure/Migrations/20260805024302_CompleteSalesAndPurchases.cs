using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CompleteSalesAndPurchases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OfficialBrandId",
                table: "Suppliers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierType",
                table: "Suppliers",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "TERCERO");

            migrationBuilder.AddColumn<string>(
                name: "AccountingClassification",
                table: "SaleDetails",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "HISTORICO_SIN_CLASIFICAR");

            migrationBuilder.AddColumn<int>(
                name: "BrandId",
                table: "SaleDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BrandName",
                table: "SaleDetails",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "SaleDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalCost",
                table: "SaleDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "SaleDetails",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "OfficialBrandId",
                table: "Purchases",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OfficialBrandName",
                table: "Purchases",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PurchaseOrderDate",
                table: "Purchases",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PurchaseOrderNumber",
                table: "Purchases",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReceivedAt",
                table: "Purchases",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");

            migrationBuilder.AddColumn<string>(
                name: "SupplierType",
                table: "Purchases",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "TERCERO");

            migrationBuilder.AddColumn<int>(
                name: "BrandId",
                table: "PurchaseDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BrandName",
                table: "PurchaseDetails",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE purchase
                SET purchase.ReceivedAt = purchase.Date,
                    purchase.SupplierType = COALESCE(NULLIF(supplier.SupplierType, ''), 'TERCERO'),
                    purchase.OfficialBrandId = supplier.OfficialBrandId,
                    purchase.OfficialBrandName = brand.Name
                FROM Purchases purchase
                INNER JOIN Suppliers supplier ON supplier.Id = purchase.SupplierId
                LEFT JOIN Brands brand ON brand.Id = supplier.OfficialBrandId;

                UPDATE detail
                SET detail.BrandId = product.BrandId,
                    detail.BrandName = brand.Name,
                    detail.AccountingClassification = COALESCE(category.Name, 'HISTORICO_SIN_CLASIFICAR')
                FROM SaleDetails detail
                INNER JOIN Products product ON product.Id = detail.ProductId
                LEFT JOIN Brands brand ON brand.Id = product.BrandId
                LEFT JOIN Categories category ON category.Id = product.CategoryId;

                UPDATE detail
                SET detail.BrandId = product.BrandId,
                    detail.BrandName = brand.Name
                FROM PurchaseDetails detail
                INNER JOIN Products product ON product.Id = detail.ProductId
                LEFT JOIN Brands brand ON brand.Id = product.BrandId;");

            migrationBuilder.CreateTable(
                name: "SaleAdjustments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    SaleId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    DocumentType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DocumentNumber = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    RestocksInventory = table.Column<bool>(type: "bit", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleAdjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleAdjustments_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SaleAdjustments_Sales_SaleId",
                        column: x => x.SaleId,
                        principalTable: "Sales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SaleAdjustmentDetails",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SaleAdjustmentId = table.Column<int>(type: "int", nullable: false),
                    SaleDetailId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    UnitOfMeasureId = table.Column<int>(type: "int", nullable: true),
                    UnitCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    QuantityBase = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TaxRate = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SubTotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    UnitCost = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    TotalCost = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    BrandId = table.Column<int>(type: "int", nullable: true),
                    BrandName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    AccountingClassification = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleAdjustmentDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SaleAdjustmentDetails_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SaleAdjustmentDetails_SaleAdjustments_SaleAdjustmentId",
                        column: x => x.SaleAdjustmentId,
                        principalTable: "SaleAdjustments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SaleAdjustmentDetails_SaleDetails_SaleDetailId",
                        column: x => x.SaleDetailId,
                        principalTable: "SaleDetails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_OfficialBrandId",
                table: "Suppliers",
                column: "OfficialBrandId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleAdjustmentDetails_ProductId",
                table: "SaleAdjustmentDetails",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleAdjustmentDetails_SaleAdjustmentId",
                table: "SaleAdjustmentDetails",
                column: "SaleAdjustmentId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleAdjustmentDetails_SaleDetailId",
                table: "SaleAdjustmentDetails",
                column: "SaleDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleAdjustments_BranchId",
                table: "SaleAdjustments",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleAdjustments_SaleId",
                table: "SaleAdjustments",
                column: "SaleId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleAdjustments_TenantId_DocumentNumber",
                table: "SaleAdjustments",
                columns: new[] { "TenantId", "DocumentNumber" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Suppliers_Brands_OfficialBrandId",
                table: "Suppliers",
                column: "OfficialBrandId",
                principalTable: "Brands",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Suppliers_Brands_OfficialBrandId",
                table: "Suppliers");

            migrationBuilder.DropTable(
                name: "SaleAdjustmentDetails");

            migrationBuilder.DropTable(
                name: "SaleAdjustments");

            migrationBuilder.DropIndex(
                name: "IX_Suppliers_OfficialBrandId",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "OfficialBrandId",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "SupplierType",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "AccountingClassification",
                table: "SaleDetails");

            migrationBuilder.DropColumn(
                name: "BrandId",
                table: "SaleDetails");

            migrationBuilder.DropColumn(
                name: "BrandName",
                table: "SaleDetails");

            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "SaleDetails");

            migrationBuilder.DropColumn(
                name: "TotalCost",
                table: "SaleDetails");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "SaleDetails");

            migrationBuilder.DropColumn(
                name: "OfficialBrandId",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "OfficialBrandName",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "PurchaseOrderDate",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "PurchaseOrderNumber",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "ReceivedAt",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "SupplierType",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "BrandId",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "BrandName",
                table: "PurchaseDetails");
        }
    }
}
