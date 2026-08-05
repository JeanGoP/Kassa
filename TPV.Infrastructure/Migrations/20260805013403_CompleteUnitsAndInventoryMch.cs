using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CompleteUnitsAndInventoryMch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "QuantityBase",
                table: "WarrantyReplacementParts",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "UnitOfMeasureId",
                table: "WarrantyReplacementParts",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Quantity",
                table: "Stocks",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<decimal>(
                name: "MinStockLevel",
                table: "Stocks",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<decimal>(
                name: "MaxStockLevel",
                table: "Stocks",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<decimal>(
                name: "Quantity",
                table: "ServiceOrderParts",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<decimal>(
                name: "QuantityBase",
                table: "ServiceOrderParts",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "UnitCode",
                table: "ServiceOrderParts",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "UnitOfMeasureId",
                table: "ServiceOrderParts",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Quantity",
                table: "SaleDetails",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<decimal>(
                name: "QuantityBase",
                table: "SaleDetails",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "UnitCode",
                table: "SaleDetails",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "UnitOfMeasureId",
                table: "SaleDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "TotalQuantity",
                table: "QuotationSearchHistories",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<decimal>(
                name: "AvailableQuantity",
                table: "QuotationDetails",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<decimal>(
                name: "Quantity",
                table: "PurchaseDetails",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<decimal>(
                name: "QuantityBase",
                table: "PurchaseDetails",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "UnitCode",
                table: "PurchaseDetails",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "UnitOfMeasureId",
                table: "PurchaseDetails",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AllowsFractionalQuantity",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "BaseUnitId",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PurchaseUnitId",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SaleUnitId",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "QuantityBase",
                table: "PreparationOrderItems",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "UnitOfMeasureId",
                table: "PreparationOrderItems",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "InventoryLocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryLocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryLocations_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UnitsOfMeasure",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Symbol = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AllowsDecimals = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnitsOfMeasure", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InventoryLocationBalances",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    InventoryLocationId = table.Column<int>(type: "int", nullable: false),
                    QuantityBase = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryLocationBalances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryLocationBalances_InventoryLocations_InventoryLocationId",
                        column: x => x.InventoryLocationId,
                        principalTable: "InventoryLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryLocationBalances_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InventoryMovements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    InventoryLocationId = table.Column<int>(type: "int", nullable: true),
                    DestinationBranchId = table.Column<int>(type: "int", nullable: true),
                    DestinationLocationId = table.Column<int>(type: "int", nullable: true),
                    MovementType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    UnitOfMeasureId = table.Column<int>(type: "int", nullable: false),
                    UnitCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FactorToBase = table.Column<decimal>(type: "decimal(18,6)", nullable: false),
                    BaseQuantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    DocumentType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    DocumentId = table.Column<int>(type: "int", nullable: true),
                    DocumentNumber = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    OccurredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryMovements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryMovements_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryMovements_Branches_DestinationBranchId",
                        column: x => x.DestinationBranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryMovements_InventoryLocations_DestinationLocationId",
                        column: x => x.DestinationLocationId,
                        principalTable: "InventoryLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryMovements_InventoryLocations_InventoryLocationId",
                        column: x => x.InventoryLocationId,
                        principalTable: "InventoryLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryMovements_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryMovements_UnitsOfMeasure_UnitOfMeasureId",
                        column: x => x.UnitOfMeasureId,
                        principalTable: "UnitsOfMeasure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductUnitConversions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    UnitOfMeasureId = table.Column<int>(type: "int", nullable: false),
                    UsageType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FactorToBase = table.Column<decimal>(type: "decimal(18,6)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductUnitConversions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductUnitConversions_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductUnitConversions_UnitsOfMeasure_UnitOfMeasureId",
                        column: x => x.UnitOfMeasureId,
                        principalTable: "UnitsOfMeasure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql(
                """
                INSERT INTO UnitsOfMeasure (TenantId, Code, Name, Symbol, AllowsDecimals, CreatedAt, IsActive)
                SELECT t.Id, u.Code, u.Name, u.Symbol, u.AllowsDecimals, SYSUTCDATETIME(), 1
                FROM Tenants t
                CROSS APPLY (VALUES
                    ('UND', 'UNIDAD', 'UND', CAST(0 AS bit)),
                    ('CAJA', 'CAJA', 'CAJA', CAST(0 AS bit)),
                    ('L', 'LITRO', 'L', CAST(1 AS bit)),
                    ('ML', 'MILILITRO', 'ML', CAST(1 AS bit)),
                    ('KG', 'KILOGRAMO', 'KG', CAST(1 AS bit)),
                    ('G', 'GRAMO', 'G', CAST(1 AS bit)),
                    ('M', 'METRO', 'M', CAST(1 AS bit)),
                    ('H', 'HORA', 'H', CAST(1 AS bit))
                ) u(Code, Name, Symbol, AllowsDecimals);

                UPDATE p
                SET BaseUnitId = COALESCE(matchUnit.Id, defaultUnit.Id),
                    PurchaseUnitId = COALESCE(matchUnit.Id, defaultUnit.Id),
                    SaleUnitId = COALESCE(matchUnit.Id, defaultUnit.Id),
                    UnitOfMeasure = COALESCE(matchUnit.Code, defaultUnit.Code)
                FROM Products p
                INNER JOIN UnitsOfMeasure defaultUnit ON defaultUnit.TenantId = p.TenantId AND defaultUnit.Code = 'UND'
                LEFT JOIN UnitsOfMeasure matchUnit ON matchUnit.TenantId = p.TenantId
                    AND matchUnit.Code = UPPER(LTRIM(RTRIM(COALESCE(p.UnitOfMeasure, 'UND'))));

                INSERT INTO ProductUnitConversions
                    (TenantId, ProductId, UnitOfMeasureId, UsageType, FactorToBase, CreatedAt, IsActive)
                SELECT p.TenantId, p.Id, v.UnitId, v.UsageType, 1, SYSUTCDATETIME(), 1
                FROM Products p
                CROSS APPLY (VALUES
                    (p.BaseUnitId, 'BASE'),
                    (p.PurchaseUnitId, 'PURCHASE'),
                    (p.SaleUnitId, 'SALE')
                ) v(UnitId, UsageType)
                WHERE v.UnitId IS NOT NULL;

                UPDATE d SET UnitOfMeasureId = p.SaleUnitId, UnitCode = u.Code, QuantityBase = d.Quantity
                FROM SaleDetails d
                INNER JOIN Products p ON p.Id = d.ProductId
                INNER JOIN UnitsOfMeasure u ON u.Id = p.SaleUnitId;

                UPDATE d SET UnitOfMeasureId = p.PurchaseUnitId, UnitCode = u.Code, QuantityBase = d.Quantity
                FROM PurchaseDetails d
                INNER JOIN Products p ON p.Id = d.ProductId
                INNER JOIN UnitsOfMeasure u ON u.Id = p.PurchaseUnitId;

                UPDATE d SET UnitOfMeasureId = p.SaleUnitId, UnitCode = u.Code, QuantityBase = d.Quantity
                FROM ServiceOrderParts d
                INNER JOIN Products p ON p.Id = d.ProductId
                INNER JOIN UnitsOfMeasure u ON u.Id = p.SaleUnitId;

                UPDATE d
                SET UnitOfMeasureId = COALESCE(lineUnit.Id, p.SaleUnitId, defaultUnit.Id),
                    Unit = COALESCE(lineUnit.Code, saleUnit.Code, defaultUnit.Code),
                    QuantityBase = d.Quantity
                FROM PreparationOrderItems d
                INNER JOIN PreparationOrders o ON o.Id = d.PreparationOrderId
                INNER JOIN UnitsOfMeasure defaultUnit ON defaultUnit.TenantId = o.TenantId AND defaultUnit.Code = 'UND'
                LEFT JOIN Products p ON p.Id = d.ProductId
                LEFT JOIN UnitsOfMeasure saleUnit ON saleUnit.Id = p.SaleUnitId
                LEFT JOIN UnitsOfMeasure lineUnit ON lineUnit.TenantId = o.TenantId
                    AND lineUnit.Code = UPPER(LTRIM(RTRIM(COALESCE(d.Unit, 'UND'))));

                UPDATE d
                SET UnitOfMeasureId = COALESCE(lineUnit.Id, p.SaleUnitId, defaultUnit.Id),
                    Unit = COALESCE(lineUnit.Code, saleUnit.Code, defaultUnit.Code),
                    QuantityBase = d.Quantity
                FROM WarrantyReplacementParts d
                INNER JOIN Warranties w ON w.Id = d.WarrantyId
                INNER JOIN UnitsOfMeasure defaultUnit ON defaultUnit.TenantId = w.TenantId AND defaultUnit.Code = 'UND'
                LEFT JOIN Products p ON p.Id = d.ProductId
                LEFT JOIN UnitsOfMeasure saleUnit ON saleUnit.Id = p.SaleUnitId
                LEFT JOIN UnitsOfMeasure lineUnit ON lineUnit.TenantId = w.TenantId
                    AND lineUnit.Code = UPPER(LTRIM(RTRIM(COALESCE(d.Unit, 'UND'))));

                INSERT INTO InventoryLocations
                    (TenantId, BranchId, Code, Name, Description, IsDefault, CreatedAt, IsActive)
                SELECT b.TenantId, b.Id, 'GENERAL', 'UBICACIÓN GENERAL',
                    'SALDO INICIAL MIGRADO DE LA SUCURSAL', 1, SYSUTCDATETIME(), 1
                FROM Branches b;

                INSERT INTO InventoryLocationBalances
                    (TenantId, ProductId, InventoryLocationId, QuantityBase, CreatedAt, IsActive)
                SELECT s.TenantId, s.ProductId, l.Id, s.Quantity, SYSUTCDATETIME(), 1
                FROM Stocks s
                INNER JOIN InventoryLocations l ON l.BranchId = s.BranchId AND l.TenantId = s.TenantId AND l.IsDefault = 1;

                INSERT INTO InventoryMovements
                    (TenantId, ProductId, BranchId, InventoryLocationId, MovementType, Quantity,
                     UnitOfMeasureId, UnitCode, FactorToBase, BaseQuantity, DocumentType, Reason,
                     OccurredAt, CreatedAt, IsActive)
                SELECT s.TenantId, s.ProductId, s.BranchId, l.Id, 'SALDO_INICIAL', s.Quantity,
                    p.BaseUnitId, u.Code, 1, s.Quantity, 'MIGRACION',
                    'SALDO INICIAL AL HABILITAR KARDEX Y UBICACIONES',
                    SYSUTCDATETIME(), SYSUTCDATETIME(), 1
                FROM Stocks s
                INNER JOIN Products p ON p.Id = s.ProductId
                INNER JOIN UnitsOfMeasure u ON u.Id = p.BaseUnitId
                INNER JOIN InventoryLocations l ON l.BranchId = s.BranchId AND l.TenantId = s.TenantId AND l.IsDefault = 1
                WHERE s.Quantity <> 0;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_WarrantyReplacementParts_UnitOfMeasureId",
                table: "WarrantyReplacementParts",
                column: "UnitOfMeasureId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrderParts_UnitOfMeasureId",
                table: "ServiceOrderParts",
                column: "UnitOfMeasureId");

            migrationBuilder.CreateIndex(
                name: "IX_SaleDetails_UnitOfMeasureId",
                table: "SaleDetails",
                column: "UnitOfMeasureId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseDetails_UnitOfMeasureId",
                table: "PurchaseDetails",
                column: "UnitOfMeasureId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_BaseUnitId",
                table: "Products",
                column: "BaseUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_PurchaseUnitId",
                table: "Products",
                column: "PurchaseUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_SaleUnitId",
                table: "Products",
                column: "SaleUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrderItems_UnitOfMeasureId",
                table: "PreparationOrderItems",
                column: "UnitOfMeasureId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLocationBalances_InventoryLocationId",
                table: "InventoryLocationBalances",
                column: "InventoryLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLocationBalances_ProductId",
                table: "InventoryLocationBalances",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLocationBalances_TenantId_ProductId_InventoryLocationId",
                table: "InventoryLocationBalances",
                columns: new[] { "TenantId", "ProductId", "InventoryLocationId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLocations_BranchId",
                table: "InventoryLocations",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLocations_TenantId_BranchId_Code",
                table: "InventoryLocations",
                columns: new[] { "TenantId", "BranchId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryMovements_BranchId",
                table: "InventoryMovements",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryMovements_DestinationBranchId",
                table: "InventoryMovements",
                column: "DestinationBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryMovements_DestinationLocationId",
                table: "InventoryMovements",
                column: "DestinationLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryMovements_InventoryLocationId",
                table: "InventoryMovements",
                column: "InventoryLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryMovements_ProductId",
                table: "InventoryMovements",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryMovements_TenantId_OccurredAt",
                table: "InventoryMovements",
                columns: new[] { "TenantId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryMovements_UnitOfMeasureId",
                table: "InventoryMovements",
                column: "UnitOfMeasureId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductUnitConversions_ProductId",
                table: "ProductUnitConversions",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductUnitConversions_TenantId_ProductId_UsageType",
                table: "ProductUnitConversions",
                columns: new[] { "TenantId", "ProductId", "UsageType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductUnitConversions_UnitOfMeasureId",
                table: "ProductUnitConversions",
                column: "UnitOfMeasureId");

            migrationBuilder.CreateIndex(
                name: "IX_UnitsOfMeasure_TenantId_Code",
                table: "UnitsOfMeasure",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PreparationOrderItems_UnitsOfMeasure_UnitOfMeasureId",
                table: "PreparationOrderItems",
                column: "UnitOfMeasureId",
                principalTable: "UnitsOfMeasure",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_UnitsOfMeasure_BaseUnitId",
                table: "Products",
                column: "BaseUnitId",
                principalTable: "UnitsOfMeasure",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_UnitsOfMeasure_PurchaseUnitId",
                table: "Products",
                column: "PurchaseUnitId",
                principalTable: "UnitsOfMeasure",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_UnitsOfMeasure_SaleUnitId",
                table: "Products",
                column: "SaleUnitId",
                principalTable: "UnitsOfMeasure",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseDetails_UnitsOfMeasure_UnitOfMeasureId",
                table: "PurchaseDetails",
                column: "UnitOfMeasureId",
                principalTable: "UnitsOfMeasure",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SaleDetails_UnitsOfMeasure_UnitOfMeasureId",
                table: "SaleDetails",
                column: "UnitOfMeasureId",
                principalTable: "UnitsOfMeasure",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceOrderParts_UnitsOfMeasure_UnitOfMeasureId",
                table: "ServiceOrderParts",
                column: "UnitOfMeasureId",
                principalTable: "UnitsOfMeasure",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WarrantyReplacementParts_UnitsOfMeasure_UnitOfMeasureId",
                table: "WarrantyReplacementParts",
                column: "UnitOfMeasureId",
                principalTable: "UnitsOfMeasure",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PreparationOrderItems_UnitsOfMeasure_UnitOfMeasureId",
                table: "PreparationOrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Products_UnitsOfMeasure_BaseUnitId",
                table: "Products");

            migrationBuilder.DropForeignKey(
                name: "FK_Products_UnitsOfMeasure_PurchaseUnitId",
                table: "Products");

            migrationBuilder.DropForeignKey(
                name: "FK_Products_UnitsOfMeasure_SaleUnitId",
                table: "Products");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseDetails_UnitsOfMeasure_UnitOfMeasureId",
                table: "PurchaseDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_SaleDetails_UnitsOfMeasure_UnitOfMeasureId",
                table: "SaleDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceOrderParts_UnitsOfMeasure_UnitOfMeasureId",
                table: "ServiceOrderParts");

            migrationBuilder.DropForeignKey(
                name: "FK_WarrantyReplacementParts_UnitsOfMeasure_UnitOfMeasureId",
                table: "WarrantyReplacementParts");

            migrationBuilder.DropTable(
                name: "InventoryLocationBalances");

            migrationBuilder.DropTable(
                name: "InventoryMovements");

            migrationBuilder.DropTable(
                name: "ProductUnitConversions");

            migrationBuilder.DropTable(
                name: "InventoryLocations");

            migrationBuilder.DropTable(
                name: "UnitsOfMeasure");

            migrationBuilder.DropIndex(
                name: "IX_WarrantyReplacementParts_UnitOfMeasureId",
                table: "WarrantyReplacementParts");

            migrationBuilder.DropIndex(
                name: "IX_ServiceOrderParts_UnitOfMeasureId",
                table: "ServiceOrderParts");

            migrationBuilder.DropIndex(
                name: "IX_SaleDetails_UnitOfMeasureId",
                table: "SaleDetails");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseDetails_UnitOfMeasureId",
                table: "PurchaseDetails");

            migrationBuilder.DropIndex(
                name: "IX_Products_BaseUnitId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_PurchaseUnitId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_SaleUnitId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_PreparationOrderItems_UnitOfMeasureId",
                table: "PreparationOrderItems");

            migrationBuilder.DropColumn(
                name: "QuantityBase",
                table: "WarrantyReplacementParts");

            migrationBuilder.DropColumn(
                name: "UnitOfMeasureId",
                table: "WarrantyReplacementParts");

            migrationBuilder.DropColumn(
                name: "QuantityBase",
                table: "ServiceOrderParts");

            migrationBuilder.DropColumn(
                name: "UnitCode",
                table: "ServiceOrderParts");

            migrationBuilder.DropColumn(
                name: "UnitOfMeasureId",
                table: "ServiceOrderParts");

            migrationBuilder.DropColumn(
                name: "QuantityBase",
                table: "SaleDetails");

            migrationBuilder.DropColumn(
                name: "UnitCode",
                table: "SaleDetails");

            migrationBuilder.DropColumn(
                name: "UnitOfMeasureId",
                table: "SaleDetails");

            migrationBuilder.DropColumn(
                name: "QuantityBase",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "UnitCode",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "UnitOfMeasureId",
                table: "PurchaseDetails");

            migrationBuilder.DropColumn(
                name: "AllowsFractionalQuantity",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "BaseUnitId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "PurchaseUnitId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SaleUnitId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "QuantityBase",
                table: "PreparationOrderItems");

            migrationBuilder.DropColumn(
                name: "UnitOfMeasureId",
                table: "PreparationOrderItems");

            migrationBuilder.AlterColumn<int>(
                name: "Quantity",
                table: "Stocks",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<int>(
                name: "MinStockLevel",
                table: "Stocks",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<int>(
                name: "MaxStockLevel",
                table: "Stocks",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<int>(
                name: "Quantity",
                table: "ServiceOrderParts",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<int>(
                name: "Quantity",
                table: "SaleDetails",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<int>(
                name: "TotalQuantity",
                table: "QuotationSearchHistories",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<int>(
                name: "AvailableQuantity",
                table: "QuotationDetails",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<int>(
                name: "Quantity",
                table: "PurchaseDetails",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");
        }
    }
}
