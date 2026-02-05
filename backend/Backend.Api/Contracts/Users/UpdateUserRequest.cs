using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Api.Contracts.Users;

public sealed class UpdateUserRequest
{
    public string? Username { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    public UserRole? Role { get; set; }

    [MinLength(8)]
    public string? Password { get; set; }
}
