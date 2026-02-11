using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UniqueRecordingSessionId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_recordings_SessionId",
                table: "recordings");

            migrationBuilder.Sql(
                """
                DELETE FROM recordings
                WHERE Id NOT IN (
                    SELECT Id FROM (
                        SELECT
                            Id,
                            ROW_NUMBER() OVER (
                                PARTITION BY SessionId
                                ORDER BY
                                    CASE WHEN EndedAt IS NULL THEN 1 ELSE 0 END,
                                    EndedAt DESC,
                                    StartedAt DESC,
                                    Id DESC
                            ) AS rn
                        FROM recordings
                    ) ranked
                    WHERE ranked.rn = 1
                );
                """);

            migrationBuilder.CreateIndex(
                name: "IX_recordings_SessionId",
                table: "recordings",
                column: "SessionId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_recordings_SessionId",
                table: "recordings");

            migrationBuilder.CreateIndex(
                name: "IX_recordings_SessionId",
                table: "recordings",
                column: "SessionId");
        }
    }
}
