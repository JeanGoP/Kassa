using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBrandAndVehicleModelCatalogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BrandId",
                table: "Vehicles",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VehicleModelId",
                table: "Vehicles",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BrandId",
                table: "ServiceOrders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VehicleModelId",
                table: "ServiceOrders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BrandId",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BrandId",
                table: "PreparationOrders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VehicleModelId",
                table: "PreparationOrders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MainBrandId",
                table: "Branches",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Brands",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Brands", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VehicleModels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    BrandId = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleModels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VehicleModels_Brands_BrandId",
                        column: x => x.BrandId,
                        principalTable: "Brands",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql(@"
                ;WITH LegacyBrands AS (
                    SELECT TenantId, LEFT(LTRIM(RTRIM(Brand)), 100) AS BrandName FROM Vehicles WHERE NULLIF(LTRIM(RTRIM(Brand)), '') IS NOT NULL
                    UNION
                    SELECT TenantId, LEFT(LTRIM(RTRIM(Brand)), 100) FROM ServiceOrders WHERE NULLIF(LTRIM(RTRIM(Brand)), '') IS NOT NULL
                    UNION
                    SELECT TenantId, LEFT(LTRIM(RTRIM(Brand)), 100) FROM PreparationOrders WHERE NULLIF(LTRIM(RTRIM(Brand)), '') IS NOT NULL
                ), NumberedBrands AS (
                    SELECT TenantId, BrandName, ROW_NUMBER() OVER (PARTITION BY TenantId ORDER BY BrandName) AS RowNumber
                    FROM LegacyBrands
                )
                INSERT INTO Brands (TenantId, Code, Name, CreatedAt, UpdatedAt, IsActive)
                SELECT TenantId, CONCAT('LEGACY-', RowNumber), BrandName, SYSUTCDATETIME(), NULL, 1
                FROM NumberedBrands;

                ;WITH LegacyModels AS (
                    SELECT TenantId, LEFT(LTRIM(RTRIM(Brand)), 100) AS BrandName, LEFT(LTRIM(RTRIM(Model)), 120) AS ModelName
                    FROM Vehicles WHERE NULLIF(LTRIM(RTRIM(Brand)), '') IS NOT NULL AND NULLIF(LTRIM(RTRIM(Model)), '') IS NOT NULL
                    UNION
                    SELECT TenantId, LEFT(LTRIM(RTRIM(Brand)), 100), LEFT(LTRIM(RTRIM(Model)), 120)
                    FROM ServiceOrders WHERE NULLIF(LTRIM(RTRIM(Brand)), '') IS NOT NULL AND NULLIF(LTRIM(RTRIM(Model)), '') IS NOT NULL
                    UNION
                    SELECT TenantId, LEFT(LTRIM(RTRIM(Brand)), 100), LEFT(LTRIM(RTRIM(Model)), 120)
                    FROM PreparationOrders WHERE NULLIF(LTRIM(RTRIM(Brand)), '') IS NOT NULL AND NULLIF(LTRIM(RTRIM(Model)), '') IS NOT NULL
                ), NumberedModels AS (
                    SELECT lm.TenantId, b.Id AS BrandId, lm.ModelName,
                        ROW_NUMBER() OVER (PARTITION BY lm.TenantId, b.Id ORDER BY lm.ModelName) AS RowNumber
                    FROM LegacyModels lm
                    INNER JOIN Brands b ON b.TenantId = lm.TenantId AND b.Name = lm.BrandName
                )
                INSERT INTO VehicleModels (TenantId, BrandId, Code, Name, CreatedAt, UpdatedAt, IsActive)
                SELECT TenantId, BrandId, CONCAT('LEGACY-', RowNumber), ModelName, SYSUTCDATETIME(), NULL, 1
                FROM NumberedModels;

                UPDATE v SET v.BrandId = b.Id, v.VehicleModelId = m.Id
                FROM Vehicles v
                INNER JOIN Brands b ON b.TenantId = v.TenantId AND b.Name = LEFT(LTRIM(RTRIM(v.Brand)), 100)
                INNER JOIN VehicleModels m ON m.TenantId = v.TenantId AND m.BrandId = b.Id AND m.Name = LEFT(LTRIM(RTRIM(v.Model)), 120);

                UPDATE o SET o.BrandId = b.Id, o.VehicleModelId = m.Id
                FROM ServiceOrders o
                INNER JOIN Brands b ON b.TenantId = o.TenantId AND b.Name = LEFT(LTRIM(RTRIM(o.Brand)), 100)
                INNER JOIN VehicleModels m ON m.TenantId = o.TenantId AND m.BrandId = b.Id AND m.Name = LEFT(LTRIM(RTRIM(o.Model)), 120);

                UPDATE o SET o.BrandId = b.Id, o.VehicleModelId = m.Id
                FROM PreparationOrders o
                INNER JOIN Brands b ON b.TenantId = o.TenantId AND b.Name = LEFT(LTRIM(RTRIM(o.Brand)), 100)
                INNER JOIN VehicleModels m ON m.TenantId = o.TenantId AND m.BrandId = b.Id AND m.Name = LEFT(LTRIM(RTRIM(o.Model)), 120);

                ;WITH SingleBrand AS (
                    SELECT TenantId, MIN(Id) AS BrandId FROM Brands GROUP BY TenantId HAVING COUNT(*) = 1
                )
                UPDATE br SET br.MainBrandId = sb.BrandId
                FROM Branches br INNER JOIN SingleBrand sb ON sb.TenantId = br.TenantId;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_BrandId",
                table: "Vehicles",
                column: "BrandId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_VehicleModelId",
                table: "Vehicles",
                column: "VehicleModelId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrders_BrandId",
                table: "ServiceOrders",
                column: "BrandId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrders_VehicleModelId",
                table: "ServiceOrders",
                column: "VehicleModelId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_BrandId",
                table: "Products",
                column: "BrandId");

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrders_BrandId",
                table: "PreparationOrders",
                column: "BrandId");

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrders_VehicleModelId",
                table: "PreparationOrders",
                column: "VehicleModelId");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_MainBrandId",
                table: "Branches",
                column: "MainBrandId");

            migrationBuilder.CreateIndex(
                name: "IX_Brands_TenantId_Code",
                table: "Brands",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Brands_TenantId_Name",
                table: "Brands",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VehicleModels_BrandId",
                table: "VehicleModels",
                column: "BrandId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleModels_TenantId_BrandId_Code",
                table: "VehicleModels",
                columns: new[] { "TenantId", "BrandId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VehicleModels_TenantId_BrandId_Name",
                table: "VehicleModels",
                columns: new[] { "TenantId", "BrandId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Branches_Brands_MainBrandId",
                table: "Branches",
                column: "MainBrandId",
                principalTable: "Brands",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PreparationOrders_Brands_BrandId",
                table: "PreparationOrders",
                column: "BrandId",
                principalTable: "Brands",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PreparationOrders_VehicleModels_VehicleModelId",
                table: "PreparationOrders",
                column: "VehicleModelId",
                principalTable: "VehicleModels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Brands_BrandId",
                table: "Products",
                column: "BrandId",
                principalTable: "Brands",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceOrders_Brands_BrandId",
                table: "ServiceOrders",
                column: "BrandId",
                principalTable: "Brands",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceOrders_VehicleModels_VehicleModelId",
                table: "ServiceOrders",
                column: "VehicleModelId",
                principalTable: "VehicleModels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicles_Brands_BrandId",
                table: "Vehicles",
                column: "BrandId",
                principalTable: "Brands",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicles_VehicleModels_VehicleModelId",
                table: "Vehicles",
                column: "VehicleModelId",
                principalTable: "VehicleModels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Branches_Brands_MainBrandId",
                table: "Branches");

            migrationBuilder.DropForeignKey(
                name: "FK_PreparationOrders_Brands_BrandId",
                table: "PreparationOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_PreparationOrders_VehicleModels_VehicleModelId",
                table: "PreparationOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_Products_Brands_BrandId",
                table: "Products");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceOrders_Brands_BrandId",
                table: "ServiceOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceOrders_VehicleModels_VehicleModelId",
                table: "ServiceOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_Vehicles_Brands_BrandId",
                table: "Vehicles");

            migrationBuilder.DropForeignKey(
                name: "FK_Vehicles_VehicleModels_VehicleModelId",
                table: "Vehicles");

            migrationBuilder.DropTable(
                name: "VehicleModels");

            migrationBuilder.DropTable(
                name: "Brands");

            migrationBuilder.DropIndex(
                name: "IX_Vehicles_BrandId",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_Vehicles_VehicleModelId",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_ServiceOrders_BrandId",
                table: "ServiceOrders");

            migrationBuilder.DropIndex(
                name: "IX_ServiceOrders_VehicleModelId",
                table: "ServiceOrders");

            migrationBuilder.DropIndex(
                name: "IX_Products_BrandId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_PreparationOrders_BrandId",
                table: "PreparationOrders");

            migrationBuilder.DropIndex(
                name: "IX_PreparationOrders_VehicleModelId",
                table: "PreparationOrders");

            migrationBuilder.DropIndex(
                name: "IX_Branches_MainBrandId",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "BrandId",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "VehicleModelId",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "BrandId",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "VehicleModelId",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "BrandId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "BrandId",
                table: "PreparationOrders");

            migrationBuilder.DropColumn(
                name: "VehicleModelId",
                table: "PreparationOrders");

            migrationBuilder.DropColumn(
                name: "MainBrandId",
                table: "Branches");
        }
    }
}
