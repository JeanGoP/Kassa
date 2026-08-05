using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CompleteManufacturerWarrantiesMch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ApprovedValue",
                table: "Warranties",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "AttributedCause",
                table: "Warranties",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AuthorizationDate",
                table: "Warranties",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AuthorizationNumber",
                table: "Warranties",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BranchId",
                table: "Warranties",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BranchName",
                table: "Warranties",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BrandId",
                table: "Warranties",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BrandName",
                table: "Warranties",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CausingPartDescription",
                table: "Warranties",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "CausingPartProductId",
                table: "Warranties",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CausingPartReference",
                table: "Warranties",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ChassisNumber",
                table: "Warranties",
                type: "nvarchar(17)",
                maxLength: 17,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ClaimType",
                table: "Warranties",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CompanyName",
                table: "Warranties",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CompanyNit",
                table: "Warranties",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CustomerEquivalentValue",
                table: "Warranties",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "DetectionMoment",
                table: "Warranties",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "FailureDate",
                table: "Warranties",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "FailureDescription",
                table: "Warranties",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "FailureMileage",
                table: "Warranties",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "FailureMode",
                table: "Warranties",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FiledAt",
                table: "Warranties",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsLegacyRecord",
                table: "Warranties",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ManufacturerInvoiceId",
                table: "Warranties",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManufacturerStatus",
                table: "Warranties",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ManufacturingDate",
                table: "Warranties",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RecognizedLaborHours",
                table: "Warranties",
                type: "decimal(9,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RecognizedLaborValue",
                table: "Warranties",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RecognizedValue",
                table: "Warranties",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RejectedValue",
                table: "Warranties",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "Warranties",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ServiceOrderId",
                table: "Warranties",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VehicleId",
                table: "Warranties",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VehicleOrPartLot",
                table: "Warranties",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WarrantyNumber",
                table: "Warranties",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "WarrantyManufacturerInvoices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    InvoiceDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PaymentReference = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WarrantyManufacturerInvoices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WarrantyReplacementParts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    WarrantyId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: true),
                    Reference = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    UnitValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WarrantyReplacementParts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WarrantyReplacementParts_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WarrantyReplacementParts_Warranties_WarrantyId",
                        column: x => x.WarrantyId,
                        principalTable: "Warranties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WarrantyStatusHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    WarrantyId = table.Column<int>(type: "int", nullable: false),
                    ManufacturerStatus = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ChangedByUserId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ChangedByName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WarrantyStatusHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WarrantyStatusHistories_Warranties_WarrantyId",
                        column: x => x.WarrantyId,
                        principalTable: "Warranties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(@"
                UPDATE warranty
                SET WarrantyNumber = CONCAT('GAR-LEGACY-', warranty.TenantId, '-', warranty.Id),
                    CompanyName = COALESCE(tenant.Name, ''),
                    CompanyNit = tenant.Nit,
                    BranchId = vehicle.BranchId,
                    BranchName = branch.Name,
                    BrandId = vehicle.BrandId,
                    BrandName = COALESCE(brand.Name, vehicle.Brand),
                    VehicleId = vehicle.Id,
                    ChassisNumber = COALESCE(vehicle.ChassisNumber, ''),
                    ClaimType = 'CORRECTIVA',
                    DetectionMoment = 'RECIBO',
                    FailureDate = warranty.StartDate,
                    FailureMileage = warranty.StartMileage,
                    FailureDescription = warranty.Description,
                    CausingPartReference = 'NO_REGISTRADA_HISTORICO',
                    CausingPartDescription = 'Informacion no capturada en el registro original',
                    ManufacturerStatus = CONCAT('COBERTURA_', UPPER(warranty.Status)),
                    IsLegacyRecord = 1
                FROM Warranties warranty
                LEFT JOIN Tenants tenant ON tenant.Id = warranty.TenantId
                OUTER APPLY (
                    SELECT TOP (1) candidate.*
                    FROM Vehicles candidate
                    WHERE candidate.TenantId = warranty.TenantId
                      AND NULLIF(warranty.Plate, '') IS NOT NULL
                      AND candidate.Plate = warranty.Plate
                    ORDER BY candidate.Id DESC
                ) vehicle
                LEFT JOIN Branches branch ON branch.Id = vehicle.BranchId
                LEFT JOIN Brands brand ON brand.Id = vehicle.BrandId;

                INSERT INTO WarrantyStatusHistories
                    (TenantId, WarrantyId, ManufacturerStatus, ChangedAt, ChangedByUserId, ChangedByName, Notes, CreatedAt, UpdatedAt, IsActive)
                SELECT TenantId,
                       Id,
                       ManufacturerStatus,
                       COALESCE(UpdatedAt, CreatedAt),
                       NULL,
                       'MIGRACION',
                       'Estado inicial de registro historico',
                       COALESCE(UpdatedAt, CreatedAt),
                       NULL,
                       1
                FROM Warranties;");

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_BranchId",
                table: "Warranties",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_BrandId",
                table: "Warranties",
                column: "BrandId");

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_CausingPartProductId",
                table: "Warranties",
                column: "CausingPartProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_ManufacturerInvoiceId",
                table: "Warranties",
                column: "ManufacturerInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_ServiceOrderId",
                table: "Warranties",
                column: "ServiceOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_TenantId_WarrantyNumber",
                table: "Warranties",
                columns: new[] { "TenantId", "WarrantyNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Warranties_VehicleId",
                table: "Warranties",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_WarrantyManufacturerInvoices_TenantId_InvoiceNumber",
                table: "WarrantyManufacturerInvoices",
                columns: new[] { "TenantId", "InvoiceNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WarrantyReplacementParts_ProductId",
                table: "WarrantyReplacementParts",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_WarrantyReplacementParts_TenantId_WarrantyId",
                table: "WarrantyReplacementParts",
                columns: new[] { "TenantId", "WarrantyId" });

            migrationBuilder.CreateIndex(
                name: "IX_WarrantyReplacementParts_WarrantyId",
                table: "WarrantyReplacementParts",
                column: "WarrantyId");

            migrationBuilder.CreateIndex(
                name: "IX_WarrantyStatusHistories_TenantId_WarrantyId_ChangedAt",
                table: "WarrantyStatusHistories",
                columns: new[] { "TenantId", "WarrantyId", "ChangedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WarrantyStatusHistories_WarrantyId",
                table: "WarrantyStatusHistories",
                column: "WarrantyId");

            migrationBuilder.AddForeignKey(
                name: "FK_Warranties_Branches_BranchId",
                table: "Warranties",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Warranties_Brands_BrandId",
                table: "Warranties",
                column: "BrandId",
                principalTable: "Brands",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Warranties_Products_CausingPartProductId",
                table: "Warranties",
                column: "CausingPartProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Warranties_ServiceOrders_ServiceOrderId",
                table: "Warranties",
                column: "ServiceOrderId",
                principalTable: "ServiceOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Warranties_Vehicles_VehicleId",
                table: "Warranties",
                column: "VehicleId",
                principalTable: "Vehicles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Warranties_WarrantyManufacturerInvoices_ManufacturerInvoiceId",
                table: "Warranties",
                column: "ManufacturerInvoiceId",
                principalTable: "WarrantyManufacturerInvoices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Warranties_Branches_BranchId",
                table: "Warranties");

            migrationBuilder.DropForeignKey(
                name: "FK_Warranties_Brands_BrandId",
                table: "Warranties");

            migrationBuilder.DropForeignKey(
                name: "FK_Warranties_Products_CausingPartProductId",
                table: "Warranties");

            migrationBuilder.DropForeignKey(
                name: "FK_Warranties_ServiceOrders_ServiceOrderId",
                table: "Warranties");

            migrationBuilder.DropForeignKey(
                name: "FK_Warranties_Vehicles_VehicleId",
                table: "Warranties");

            migrationBuilder.DropForeignKey(
                name: "FK_Warranties_WarrantyManufacturerInvoices_ManufacturerInvoiceId",
                table: "Warranties");

            migrationBuilder.DropTable(
                name: "WarrantyManufacturerInvoices");

            migrationBuilder.DropTable(
                name: "WarrantyReplacementParts");

            migrationBuilder.DropTable(
                name: "WarrantyStatusHistories");

            migrationBuilder.DropIndex(
                name: "IX_Warranties_BranchId",
                table: "Warranties");

            migrationBuilder.DropIndex(
                name: "IX_Warranties_BrandId",
                table: "Warranties");

            migrationBuilder.DropIndex(
                name: "IX_Warranties_CausingPartProductId",
                table: "Warranties");

            migrationBuilder.DropIndex(
                name: "IX_Warranties_ManufacturerInvoiceId",
                table: "Warranties");

            migrationBuilder.DropIndex(
                name: "IX_Warranties_ServiceOrderId",
                table: "Warranties");

            migrationBuilder.DropIndex(
                name: "IX_Warranties_TenantId_WarrantyNumber",
                table: "Warranties");

            migrationBuilder.DropIndex(
                name: "IX_Warranties_VehicleId",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "ApprovedValue",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "AttributedCause",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "AuthorizationDate",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "AuthorizationNumber",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "BranchName",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "BrandId",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "BrandName",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "CausingPartDescription",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "CausingPartProductId",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "CausingPartReference",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "ChassisNumber",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "ClaimType",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "CompanyName",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "CompanyNit",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "CustomerEquivalentValue",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "DetectionMoment",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "FailureDate",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "FailureDescription",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "FailureMileage",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "FailureMode",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "FiledAt",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "IsLegacyRecord",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "ManufacturerInvoiceId",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "ManufacturerStatus",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "ManufacturingDate",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "RecognizedLaborHours",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "RecognizedLaborValue",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "RecognizedValue",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "RejectedValue",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "ServiceOrderId",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "VehicleId",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "VehicleOrPartLot",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "WarrantyNumber",
                table: "Warranties");
        }
    }
}
