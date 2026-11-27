using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberBooking.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentRescheduleProposal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ProposedEndAt",
                table: "Appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ProposedStartAt",
                table: "Appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RescheduleNote",
                table: "Appointments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RescheduleProposedAt",
                table: "Appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RescheduleProposedByUserId",
                table: "Appointments",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProposedEndAt",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "ProposedStartAt",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "RescheduleNote",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "RescheduleProposedAt",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "RescheduleProposedByUserId",
                table: "Appointments");
        }
    }
}
