using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseReceptionLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "InventoryLocationId",
                table: "Purchases",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(
                """
                INSERT INTO InventoryLocations
                    (TenantId, BranchId, Code, Name, Description, IsDefault, CreatedAt, IsActive)
                SELECT b.TenantId, b.Id, 'GENERAL', 'UBICACIÓN GENERAL',
                    'UBICACIÓN PREDETERMINADA DE LA SUCURSAL', 1, SYSUTCDATETIME(), 1
                FROM Branches b
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM InventoryLocations l
                    WHERE l.TenantId = b.TenantId AND l.BranchId = b.Id
                );

                UPDATE p
                SET InventoryLocationId = location.Id
                FROM Purchases p
                CROSS APPLY (
                    SELECT TOP 1 l.Id
                    FROM InventoryLocations l
                    WHERE l.TenantId = p.TenantId AND l.BranchId = p.BranchId AND l.IsActive = 1
                    ORDER BY l.IsDefault DESC, l.Id
                ) location;
                """);

            migrationBuilder.AlterColumn<int>(
                name: "InventoryLocationId",
                table: "Purchases",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_InventoryLocationId",
                table: "Purchases",
                column: "InventoryLocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Purchases_InventoryLocations_InventoryLocationId",
                table: "Purchases",
                column: "InventoryLocationId",
                principalTable: "InventoryLocations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Purchases_InventoryLocations_InventoryLocationId",
                table: "Purchases");

            migrationBuilder.DropIndex(
                name: "IX_Purchases_InventoryLocationId",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "InventoryLocationId",
                table: "Purchases");
        }
    }
}
