using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberBooking.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchIdToStaffService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_StaffServices",
                table: "StaffServices");

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "StaffServices",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.Sql(@"
                INSERT INTO ""StaffServices"" (""StaffProfileId"", ""BranchId"", ""ServiceId"")
                SELECT DISTINCT ss.""StaffProfileId"", sba.""BranchId"", ss.""ServiceId""
                FROM ""StaffServices"" ss
                INNER JOIN ""StaffBranchAssignments"" sba ON sba.""StaffProfileId"" = ss.""StaffProfileId""
                INNER JOIN ""BranchServices"" bs ON bs.""BranchId"" = sba.""BranchId"" AND bs.""ServiceId"" = ss.""ServiceId"" AND bs.""IsActive"" = TRUE
                WHERE ss.""BranchId"" = '00000000-0000-0000-0000-000000000000';

                DELETE FROM ""StaffServices""
                WHERE ""BranchId"" = '00000000-0000-0000-0000-000000000000';
            ");

            migrationBuilder.AddPrimaryKey(
                name: "PK_StaffServices",
                table: "StaffServices",
                columns: new[] { "StaffProfileId", "BranchId", "ServiceId" });

            migrationBuilder.CreateIndex(
                name: "IX_StaffServices_BranchId",
                table: "StaffServices",
                column: "BranchId");

            migrationBuilder.AddForeignKey(
                name: "FK_StaffServices_Branches_BranchId",
                table: "StaffServices",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StaffServices_Branches_BranchId",
                table: "StaffServices");

            migrationBuilder.DropPrimaryKey(
                name: "PK_StaffServices",
                table: "StaffServices");

            migrationBuilder.DropIndex(
                name: "IX_StaffServices_BranchId",
                table: "StaffServices");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "StaffServices");

            migrationBuilder.AddPrimaryKey(
                name: "PK_StaffServices",
                table: "StaffServices",
                columns: new[] { "StaffProfileId", "ServiceId" });
        }
    }
}
