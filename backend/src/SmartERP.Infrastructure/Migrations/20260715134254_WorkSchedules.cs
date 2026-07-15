using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartERP.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class WorkSchedules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WorkScheduleId",
                table: "Employees",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WorkSchedules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Monday = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Tuesday = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Wednesday = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Thursday = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Friday = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Saturday = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Sunday = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time(6)", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time(6)", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UpdatedDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkSchedules", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_WorkScheduleId",
                table: "Employees",
                column: "WorkScheduleId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkSchedules_Name",
                table: "WorkSchedules",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Employees_WorkSchedules_WorkScheduleId",
                table: "Employees",
                column: "WorkScheduleId",
                principalTable: "WorkSchedules",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Employees_WorkSchedules_WorkScheduleId",
                table: "Employees");

            migrationBuilder.DropTable(
                name: "WorkSchedules");

            migrationBuilder.DropIndex(
                name: "IX_Employees_WorkScheduleId",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "WorkScheduleId",
                table: "Employees");
        }
    }
}
