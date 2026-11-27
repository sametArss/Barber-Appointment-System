using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberBooking.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentCustomerStartAtIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Appointments_CustomerUserId_StartAt",
                table: "Appointments",
                columns: new[] { "CustomerUserId", "StartAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Appointments_CustomerUserId_StartAt",
                table: "Appointments");
        }
    }
}
