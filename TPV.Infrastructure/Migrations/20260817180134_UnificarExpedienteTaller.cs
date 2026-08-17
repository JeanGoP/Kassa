using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TPV.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UnificarExpedienteTaller : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CustomerApprovedDiagnosis",
                table: "ServiceOrders",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DiagnosedAt",
                table: "ServiceOrders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiagnosedByName",
                table: "ServiceOrders",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiagnosedByUserId",
                table: "ServiceOrders",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DiagnosisApprovalDate",
                table: "ServiceOrders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProblemDescription",
                table: "ServiceOrders",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicalDiagnosis",
                table: "ServiceOrders",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerApprovedDiagnosis",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "DiagnosedAt",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "DiagnosedByName",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "DiagnosedByUserId",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "DiagnosisApprovalDate",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "ProblemDescription",
                table: "ServiceOrders");

            migrationBuilder.DropColumn(
                name: "TechnicalDiagnosis",
                table: "ServiceOrders");
        }
    }
}
