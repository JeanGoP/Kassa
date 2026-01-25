using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateWarrantyLimits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "LimitMileage",
                table: "Warranties",
                newName: "LimitMileage1");

            migrationBuilder.AddColumn<decimal>(
                name: "LimitMileage2",
                table: "Warranties",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "LimitMileage3",
                table: "Warranties",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LimitMileage2",
                table: "Warranties");

            migrationBuilder.DropColumn(
                name: "LimitMileage3",
                table: "Warranties");

            migrationBuilder.RenameColumn(
                name: "LimitMileage1",
                table: "Warranties",
                newName: "LimitMileage");
        }
    }
}
