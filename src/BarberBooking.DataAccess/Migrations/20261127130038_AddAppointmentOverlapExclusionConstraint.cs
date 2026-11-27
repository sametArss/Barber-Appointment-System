using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberBooking.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentOverlapExclusionConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"CREATE EXTENSION IF NOT EXISTS btree_gist;");

            // Aynı personelin (şube fark etmeksizin) aynı zaman aralığında birden fazla Pending/Confirmed randevu almasını DB seviyesinde atomik olarak engeller
            migrationBuilder.Sql(@"
                ALTER TABLE ""Appointments""
                ADD CONSTRAINT ""EX_Appointments_StaffProfileId_TimeRange""
                EXCLUDE USING gist (
                    ""StaffProfileId"" WITH =,
                    tstzrange(""StartAt"", ""EndAt"", '[)') WITH &&
                )
                WHERE (""Status"" IN (1, 2));
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""Appointments""
                DROP CONSTRAINT IF EXISTS ""EX_Appointments_StaffProfileId_TimeRange"";
            ");
        }
    }
}
