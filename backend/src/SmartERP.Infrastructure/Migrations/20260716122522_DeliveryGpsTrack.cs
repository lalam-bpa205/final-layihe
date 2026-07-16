using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartERP.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DeliveryGpsTrack : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DeliveryId",
                table: "VehicleLocations",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_VehicleLocations_DeliveryId_Sequence",
                table: "VehicleLocations",
                columns: new[] { "DeliveryId", "Sequence" });

            migrationBuilder.AddForeignKey(
                name: "FK_VehicleLocations_Deliveries_DeliveryId",
                table: "VehicleLocations",
                column: "DeliveryId",
                principalTable: "Deliveries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VehicleLocations_Deliveries_DeliveryId",
                table: "VehicleLocations");

            migrationBuilder.DropIndex(
                name: "IX_VehicleLocations_DeliveryId_Sequence",
                table: "VehicleLocations");

            migrationBuilder.DropColumn(
                name: "DeliveryId",
                table: "VehicleLocations");
        }
    }
}
