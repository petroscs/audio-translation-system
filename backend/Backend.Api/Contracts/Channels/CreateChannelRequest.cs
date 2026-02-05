using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Contracts.Channels;

public sealed class CreateChannelRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string LanguageCode { get; set; } = string.Empty;
}
