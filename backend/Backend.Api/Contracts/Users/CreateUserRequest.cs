using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Api.Contracts.Users;

public sealed class CreateUserRequest
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public UserRole Role { get; set; }

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
}
