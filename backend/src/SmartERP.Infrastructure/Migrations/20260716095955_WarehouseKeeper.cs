using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartERP.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class WarehouseKeeper : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "KeeperId",
                table: "Warehouses",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_KeeperId",
                table: "Warehouses",
                column: "KeeperId");

            migrationBuilder.AddForeignKey(
                name: "FK_Warehouses_Employees_KeeperId",
                table: "Warehouses",
                column: "KeeperId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Warehouses_Employees_KeeperId",
                table: "Warehouses");

            migrationBuilder.DropIndex(
                name: "IX_Warehouses_KeeperId",
                table: "Warehouses");

            migrationBuilder.DropColumn(
                name: "KeeperId",
                table: "Warehouses");
        }
    }
}
