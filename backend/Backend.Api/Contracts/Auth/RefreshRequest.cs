using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Contracts.Auth;

public sealed class RefreshRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
