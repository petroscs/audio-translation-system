using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Contracts.Auth;

public sealed class LogoutRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
