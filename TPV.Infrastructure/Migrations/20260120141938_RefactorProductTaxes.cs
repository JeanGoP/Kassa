using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RefactorProductTaxes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TaxType",
                table: "Products",
                newName: "IvaType");

            migrationBuilder.RenameColumn(
                name: "TaxRate",
                table: "Products",
                newName: "IvaRate");

            migrationBuilder.AddColumn<decimal>(
                name: "ImpoconsumoRate",
                table: "Products",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImpoconsumoRate",
                table: "Products");

            migrationBuilder.RenameColumn(
                name: "IvaType",
                table: "Products",
                newName: "TaxType");

            migrationBuilder.RenameColumn(
                name: "IvaRate",
                table: "Products",
                newName: "TaxRate");
        }
    }
}
