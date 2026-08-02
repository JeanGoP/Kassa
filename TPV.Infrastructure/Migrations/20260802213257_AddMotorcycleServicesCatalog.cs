using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMotorcycleServicesCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MotorcycleServices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EstimatedMinutes = table.Column<int>(type: "int", nullable: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MotorcycleServices", x => x.Id);
                });

            migrationBuilder.Sql(@"
                DECLARE @DefaultServices TABLE
                (
                    Name nvarchar(160) NOT NULL,
                    Description nvarchar(500) NULL,
                    EstimatedMinutes int NULL,
                    DisplayOrder int NOT NULL
                );

                INSERT INTO @DefaultServices (Name, Description, EstimatedMinutes, DisplayOrder)
                VALUES
                    ('Revision general', 'Inspeccion general de la moto y puntos de seguridad.', 60, 10),
                    ('Cambio de aceite', 'Cambio de aceite y revision basica de niveles.', 30, 20),
                    ('Mantenimiento preventivo', 'Servicio preventivo por kilometraje o rutina.', 90, 30),
                    ('Ajuste de frenos', 'Revision, ajuste y limpieza del sistema de frenos.', 45, 40),
                    ('Cambio de pastillas o bandas', 'Cambio de elementos de freno segun estado.', 60, 50),
                    ('Revision electrica', 'Diagnostico de luces, bateria, carga y conexiones.', 60, 60),
                    ('Cambio de llantas', 'Montaje o cambio de llanta delantera o trasera.', 45, 70),
                    ('Sincronizacion', 'Ajuste de motor, carburacion o parametros de marcha.', 90, 80),
                    ('Revision de suspension', 'Inspeccion de amortiguadores, barras y direccion.', 60, 90),
                    ('Kit de arrastre', 'Revision o cambio de cadena, sprocket y catalina.', 75, 100);

                ;WITH TargetTenants AS
                (
                    SELECT CAST(0 AS int) AS TenantId
                    UNION
                    SELECT Id FROM Tenants
                )
                INSERT INTO MotorcycleServices
                    (TenantId, Name, Description, EstimatedMinutes, DisplayOrder, CreatedAt, UpdatedAt, IsActive)
                SELECT
                    target.TenantId,
                    defaults.Name,
                    defaults.Description,
                    defaults.EstimatedMinutes,
                    defaults.DisplayOrder,
                    SYSUTCDATETIME(),
                    NULL,
                    CAST(1 AS bit)
                FROM TargetTenants target
                CROSS JOIN @DefaultServices defaults
                WHERE NOT EXISTS
                (
                    SELECT 1
                    FROM MotorcycleServices existing
                    WHERE existing.TenantId = target.TenantId
                        AND existing.Name = defaults.Name
                );
            ");

            migrationBuilder.CreateIndex(
                name: "IX_MotorcycleServices_TenantId_Name",
                table: "MotorcycleServices",
                columns: new[] { "TenantId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MotorcycleServices");
        }
    }
}
