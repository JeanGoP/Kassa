using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotationSearchHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "QuotationSearchHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    SearchedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SearchTerm = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    MatchedProductName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FoundInStock = table.Column<bool>(type: "bit", nullable: false),
                    TotalQuantity = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuotationSearchHistories", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_QuotationSearchHistories_TenantId_SearchedAt",
                table: "QuotationSearchHistories",
                columns: new[] { "TenantId", "SearchedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_QuotationSearchHistories_SearchTerm",
                table: "QuotationSearchHistories",
                column: "SearchTerm");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "QuotationSearchHistories");
        }
    }
}
