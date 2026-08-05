using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CompleteServiceOrdersMch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ActualTimeHours",
                table: "ServiceOrderWorks",
                type: "decimal(9,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AddsToCustomerTotal",
                table: "ServiceOrderWorks",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "MaintenanceReviewMileage",
                table: "ServiceOrderWorks",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Payer",
                table: "ServiceOrderWorks",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "CLIENTE");

            migrationBuilder.AddColumn<string>(
                name: "ServiceType",
                table: "ServiceOrderWorks",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "CORRECTIVO");

            migrationBuilder.AddColumn<string>(
                name: "CancellationReason",
                table: "ServiceOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "ServiceOrders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancelledByName",
                table: "ServiceOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancelledByUserId",
                table: "ServiceOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyName",
                table: "ServiceOrders",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CompanyNit",
                table: "ServiceOrders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OrderNumber",
                table: "ServiceOrders",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "OrderType",
                table: "ServiceOrders",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "REPARACION");

            migrationBuilder.AddColumn<string>(
                name: "Origin",
                table: "ServiceOrders",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "TALLER");

            migrationBuilder.AddColumn<DateTime>(
                name: "PromisedDeliveryDateTime",
                table: "ServiceOrders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceivedByName",
                table: "ServiceOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceivedByUserId",
                table: "ServiceOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ActualTimeHours",
                table: "ServiceOrderParts",
                type: "decimal(9,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AddsToCustomerTotal",
                table: "ServiceOrderParts",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EstimatedTimeHours",
                table: "ServiceOrderParts",
                type: "decimal(9,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LineType",
                table: "ServiceOrderParts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "REPUESTO");

            migrationBuilder.AddColumn<int>(
                name: "MaintenanceReviewMileage",
                table: "ServiceOrderParts",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Payer",
                table: "ServiceOrderParts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "CLIENTE");

            migrationBuilder.AddColumn<string>(
                name: "ServiceType",
                table: "ServiceOrderParts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "CORRECTIVO");

            migrationBuilder.AddColumn<string>(
                name: "Technician",
                table: "ServiceOrderParts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ServiceOrderStatusHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    ServiceOrderId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
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
                    table.PrimaryKey("PK_ServiceOrderStatusHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServiceOrderStatusHistories_ServiceOrders_ServiceOrderId",
                        column: x => x.ServiceOrderId,
                        principalTable: "ServiceOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(@"
                UPDATE serviceOrder
                SET CompanyName = COALESCE(tenant.Name, ''),
                    CompanyNit = tenant.Nit,
                    OrderNumber = CONCAT('OT-LEGACY-', serviceOrder.TenantId, '-', serviceOrder.Id),
                    OrderType = CASE WHEN NULLIF(serviceOrder.OrderType, '') IS NULL THEN 'REPARACION' ELSE serviceOrder.OrderType END,
                    Origin = CASE WHEN NULLIF(serviceOrder.Origin, '') IS NULL THEN 'TALLER' ELSE serviceOrder.Origin END
                FROM ServiceOrders serviceOrder
                LEFT JOIN Tenants tenant ON tenant.Id = serviceOrder.TenantId;

                INSERT INTO ServiceOrderStatusHistories
                    (TenantId, ServiceOrderId, Status, ChangedAt, ChangedByUserId, ChangedByName, Notes, CreatedAt, UpdatedAt, IsActive)
                SELECT TenantId,
                       Id,
                       Status,
                       COALESCE(UpdatedAt, CreatedAt),
                       NULL,
                       'MIGRACION',
                       'Estado inicial migrado',
                       COALESCE(UpdatedAt, CreatedAt),
                       NULL,
                       1
                FROM ServiceOrders;");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrders_TenantId_OrderNumber",
                table: "ServiceOrders",
                columns: new[] { "TenantId", "OrderNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrderStatusHistories_ServiceOrderId",
                table: "ServiceOrderStatusHistories",
                column: "ServiceOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrderStatusHistories_TenantId_ServiceOrderId_ChangedAt",
                table: "ServiceOrderStatusHistories",
                columns: new[] { "TenantId", "ServiceOrderId", "ChangedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ServiceOrderStatusHistories");

            migrationBuilder.DropIndex(
                name: "IX_ServiceOrders_TenantId_OrderNumber",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "ActualTimeHours",
                table: "ServiceOrderWorks");

            migrationBuilder.DropColumn(
                name: "AddsToCustomerTotal",
                table: "ServiceOrderWorks");

            migrationBuilder.DropColumn(
                name: "MaintenanceReviewMileage",
                table: "ServiceOrderWorks");

            migrationBuilder.DropColumn(
                name: "Payer",
                table: "ServiceOrderWorks");

            migrationBuilder.DropColumn(
                name: "ServiceType",
                table: "ServiceOrderWorks");

            migrationBuilder.DropColumn(
                name: "CancellationReason",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "CancelledByName",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "CancelledByUserId",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "CompanyName",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "CompanyNit",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "OrderNumber",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "OrderType",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "Origin",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "PromisedDeliveryDateTime",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "ReceivedByName",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "ReceivedByUserId",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "ActualTimeHours",
                table: "ServiceOrderParts");

            migrationBuilder.DropColumn(
                name: "AddsToCustomerTotal",
                table: "ServiceOrderParts");

            migrationBuilder.DropColumn(
                name: "EstimatedTimeHours",
                table: "ServiceOrderParts");

            migrationBuilder.DropColumn(
                name: "LineType",
                table: "ServiceOrderParts");

            migrationBuilder.DropColumn(
                name: "MaintenanceReviewMileage",
                table: "ServiceOrderParts");

            migrationBuilder.DropColumn(
                name: "Payer",
                table: "ServiceOrderParts");

            migrationBuilder.DropColumn(
                name: "ServiceType",
                table: "ServiceOrderParts");

            migrationBuilder.DropColumn(
                name: "Technician",
                table: "ServiceOrderParts");
        }
    }
}
