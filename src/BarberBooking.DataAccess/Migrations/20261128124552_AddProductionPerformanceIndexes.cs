using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberBooking.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddProductionPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BusinessMembers_BusinessId",
                table: "BusinessMembers");

            migrationBuilder.CreateIndex(
                name: "IX_Users_NormalizedEmail",
                table: "Users",
                column: "NormalizedEmail",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_ExpiresAt_RevokedAt",
                table: "RefreshTokens",
                columns: new[] { "ExpiresAt", "RevokedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens",
                column: "TokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessMembers_BusinessId_UserId",
                table: "BusinessMembers",
                columns: new[] { "BusinessId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_Branches_IsActive_City_District",
                table: "Branches",
                columns: new[] { "IsActive", "City", "District" });

            migrationBuilder.CreateIndex(
                name: "IX_Branches_Location",
                table: "Branches",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "GIST");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_BranchId_StartAt",
                table: "Appointments",
                columns: new[] { "BranchId", "StartAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_BusinessId_StartAt",
                table: "Appointments",
                columns: new[] { "BusinessId", "StartAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_Status_ReminderSentAt_StartAt",
                table: "Appointments",
                columns: new[] { "Status", "ReminderSentAt", "StartAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_NormalizedEmail",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_ExpiresAt_RevokedAt",
                table: "RefreshTokens");

            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens");

            migrationBuilder.DropIndex(
                name: "IX_BusinessMembers_BusinessId_UserId",
                table: "BusinessMembers");

            migrationBuilder.DropIndex(
                name: "IX_Branches_IsActive_City_District",
                table: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_Branches_Location",
                table: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_BranchId_StartAt",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_BusinessId_StartAt",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_Status_ReminderSentAt_StartAt",
                table: "Appointments");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessMembers_BusinessId",
                table: "BusinessMembers",
                column: "BusinessId");
        }
    }
}
