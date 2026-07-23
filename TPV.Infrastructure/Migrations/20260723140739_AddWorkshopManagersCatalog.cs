using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkshopManagersCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WorkshopManagerId",
                table: "Branches",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WorkshopManagers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkshopManagers", x => x.Id);
                });

            migrationBuilder.Sql(@"
                INSERT INTO WorkshopManagers (TenantId, Name, Phone, Email, Notes, CreatedAt, UpdatedAt, IsActive)
                SELECT DISTINCT
                    b.TenantId,
                    LEFT(LTRIM(RTRIM(b.ManagerName)), 150),
                    NULL,
                    NULL,
                    NULL,
                    SYSUTCDATETIME(),
                    NULL,
                    CAST(1 AS bit)
                FROM Branches b
                WHERE b.ManagerName IS NOT NULL
                  AND LTRIM(RTRIM(b.ManagerName)) <> ''
                  AND NOT EXISTS (
                      SELECT 1
                      FROM WorkshopManagers wm
                      WHERE wm.TenantId = b.TenantId
                        AND wm.Name = LEFT(LTRIM(RTRIM(b.ManagerName)), 150)
                  );

                UPDATE b
                SET WorkshopManagerId = wm.Id
                FROM Branches b
                INNER JOIN WorkshopManagers wm
                    ON wm.TenantId = b.TenantId
                   AND wm.Name = LEFT(LTRIM(RTRIM(b.ManagerName)), 150)
                WHERE b.ManagerName IS NOT NULL
                  AND LTRIM(RTRIM(b.ManagerName)) <> '';
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_WorkshopManagerId",
                table: "Branches",
                column: "WorkshopManagerId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkshopManagers_TenantId_Name",
                table: "WorkshopManagers",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Branches_WorkshopManagers_WorkshopManagerId",
                table: "Branches",
                column: "WorkshopManagerId",
                principalTable: "WorkshopManagers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Branches_WorkshopManagers_WorkshopManagerId",
                table: "Branches");

            migrationBuilder.DropTable(
                name: "WorkshopManagers");

            migrationBuilder.DropIndex(
                name: "IX_Branches_WorkshopManagerId",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "WorkshopManagerId",
                table: "Branches");
        }
    }
}
