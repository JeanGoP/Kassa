using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleMaster : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BranchId",
                table: "ServiceOrders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChassisNumber",
                table: "ServiceOrders",
                type: "nvarchar(17)",
                maxLength: 17,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EngineNumber",
                table: "ServiceOrders",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaintenanceReviewMileage",
                table: "ServiceOrders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VehicleId",
                table: "ServiceOrders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VehicleId",
                table: "PreparationOrders",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Vehicles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    ChassisNumber = table.Column<string>(type: "nvarchar(17)", maxLength: 17, nullable: false),
                    EngineNumber = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Plate = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Brand = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Model = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Year = table.Column<int>(type: "int", nullable: true),
                    SaleDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CurrentOwnerId = table.Column<int>(type: "int", nullable: true),
                    OwnerSince = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastKnownMileage = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vehicles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Vehicles_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Vehicles_Customers_CurrentOwnerId",
                        column: x => x.CurrentOwnerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "VehicleOwnerHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    VehicleId = table.Column<int>(type: "int", nullable: false),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    OwnedFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OwnedUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleOwnerHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VehicleOwnerHistories_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VehicleOwnerHistories_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrders_BranchId",
                table: "ServiceOrders",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrders_VehicleId",
                table: "ServiceOrders",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_PreparationOrders_VehicleId",
                table: "PreparationOrders",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleOwnerHistories_CustomerId",
                table: "VehicleOwnerHistories",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleOwnerHistories_VehicleId_OwnedFrom",
                table: "VehicleOwnerHistories",
                columns: new[] { "VehicleId", "OwnedFrom" });

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_BranchId",
                table: "Vehicles",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_CurrentOwnerId",
                table: "Vehicles",
                column: "CurrentOwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_TenantId_ChassisNumber",
                table: "Vehicles",
                columns: new[] { "TenantId", "ChassisNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_TenantId_Plate",
                table: "Vehicles",
                columns: new[] { "TenantId", "Plate" });

            migrationBuilder.Sql(@"
                WITH RankedVehicles AS (
                    SELECT
                        o.TenantId,
                        o.BranchId,
                        UPPER(LTRIM(RTRIM(o.ChassisNumber))) AS ChassisNumber,
                        NULLIF(UPPER(LTRIM(RTRIM(o.EngineNumber))), '') AS EngineNumber,
                        NULLIF(UPPER(LTRIM(RTRIM(o.Plate))), '') AS Plate,
                        o.Brand,
                        o.Model,
                        o.Year,
                        o.CustomerId,
                        o.RequestedAt,
                        o.Mileage,
                        o.CreatedAt,
                        o.UpdatedAt,
                        o.IsActive,
                        ROW_NUMBER() OVER (
                            PARTITION BY o.TenantId, UPPER(LTRIM(RTRIM(o.ChassisNumber)))
                            ORDER BY o.RequestedAt DESC, o.Id DESC
                        ) AS RowNumber
                    FROM PreparationOrders o
                    WHERE LEN(LTRIM(RTRIM(o.ChassisNumber))) = 17
                      AND UPPER(LTRIM(RTRIM(o.ChassisNumber))) NOT LIKE '%[^A-Z0-9]%'
                )
                INSERT INTO Vehicles (
                    TenantId, BranchId, ChassisNumber, EngineNumber, Plate, Brand, Model, Year,
                    SaleDate, CurrentOwnerId, OwnerSince, LastKnownMileage, CreatedAt, UpdatedAt, IsActive
                )
                SELECT
                    TenantId, BranchId, ChassisNumber, EngineNumber, Plate, Brand, Model, Year,
                    NULL, CustomerId, CASE WHEN CustomerId IS NULL THEN NULL ELSE RequestedAt END,
                    Mileage, CreatedAt, UpdatedAt, IsActive
                FROM RankedVehicles
                WHERE RowNumber = 1;

                UPDATE o
                SET VehicleId = v.Id
                FROM PreparationOrders o
                INNER JOIN Vehicles v
                    ON v.TenantId = o.TenantId
                   AND v.ChassisNumber = UPPER(LTRIM(RTRIM(o.ChassisNumber)));

                INSERT INTO VehicleOwnerHistories (
                    TenantId, VehicleId, CustomerId, OwnedFrom, OwnedUntil, CreatedAt, UpdatedAt, IsActive
                )
                SELECT
                    v.TenantId, v.Id, v.CurrentOwnerId, COALESCE(v.OwnerSince, v.CreatedAt), NULL,
                    v.CreatedAt, v.UpdatedAt, 1
                FROM Vehicles v
                WHERE v.CurrentOwnerId IS NOT NULL;

                UPDATE so
                SET BranchId = s.BranchId
                FROM ServiceOrders so
                INNER JOIN Sales s ON s.ServiceOrderId = so.Id
                WHERE so.BranchId IS NULL;
            ");

            migrationBuilder.AddForeignKey(
                name: "FK_PreparationOrders_Vehicles_VehicleId",
                table: "PreparationOrders",
                column: "VehicleId",
                principalTable: "Vehicles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceOrders_Branches_BranchId",
                table: "ServiceOrders",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceOrders_Vehicles_VehicleId",
                table: "ServiceOrders",
                column: "VehicleId",
                principalTable: "Vehicles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PreparationOrders_Vehicles_VehicleId",
                table: "PreparationOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceOrders_Branches_BranchId",
                table: "ServiceOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceOrders_Vehicles_VehicleId",
                table: "ServiceOrders");

            migrationBuilder.DropTable(
                name: "VehicleOwnerHistories");

            migrationBuilder.DropTable(
                name: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_ServiceOrders_BranchId",
                table: "ServiceOrders");

            migrationBuilder.DropIndex(
                name: "IX_ServiceOrders_VehicleId",
                table: "ServiceOrders");

            migrationBuilder.DropIndex(
                name: "IX_PreparationOrders_VehicleId",
                table: "PreparationOrders");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "ChassisNumber",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "EngineNumber",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "MaintenanceReviewMileage",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "VehicleId",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "VehicleId",
                table: "PreparationOrders");
        }
    }
}
