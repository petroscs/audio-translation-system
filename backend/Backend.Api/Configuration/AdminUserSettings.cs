using Backend.Models.Enums;

namespace Backend.Api.Configuration;

public sealed class AdminUserSettings
{
    public string Username { get; set; } = "admin";
    public string Email { get; set; } = "admin@local";
    public string Password { get; set; } = "ChangeMe123!";
    public UserRole Role { get; set; } = UserRole.Admin;
}
