using Backend.Api.Configuration;
using Backend.Infrastructure.Data;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Seeding;

public static class DatabaseSeeder
{
    public static async Task SeedAdminUserAsync(IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (await dbContext.Users.AnyAsync())
        {
            return;
        }

        var adminSettings = scope.ServiceProvider.GetRequiredService<IOptions<AdminUserSettings>>().Value;
        var userService = scope.ServiceProvider.GetRequiredService<IUserService>();

        await userService.CreateAsync(
            adminSettings.Username,
            adminSettings.Email,
            adminSettings.Role,
            adminSettings.Password,
            CancellationToken.None);
    }
}
