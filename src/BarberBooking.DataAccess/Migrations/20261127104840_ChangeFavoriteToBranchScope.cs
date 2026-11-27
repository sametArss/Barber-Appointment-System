using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberBooking.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class ChangeFavoriteToBranchScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Eski işletme bazlı favori kayıtları BranchId'siz olduğu için FK ihlali oluşmaması adına temizlenir
            migrationBuilder.Sql(@"DELETE FROM ""Favorites"";");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Favorites",
                table: "Favorites");

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "Favorites",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddPrimaryKey(
                name: "PK_Favorites",
                table: "Favorites",
                columns: new[] { "UserId", "BranchId" });

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_BranchId",
                table: "Favorites",
                column: "BranchId");

            migrationBuilder.AddForeignKey(
                name: "FK_Favorites_Branches_BranchId",
                table: "Favorites",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Favorites_Branches_BranchId",
                table: "Favorites");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Favorites",
                table: "Favorites");

            migrationBuilder.DropIndex(
                name: "IX_Favorites_BranchId",
                table: "Favorites");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "Favorites");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Favorites",
                table: "Favorites",
                columns: new[] { "UserId", "BusinessId" });
        }
    }
}
