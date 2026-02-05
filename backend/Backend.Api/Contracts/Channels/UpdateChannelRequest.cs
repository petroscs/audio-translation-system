using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Contracts.Channels;

public sealed class UpdateChannelRequest
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(20)]
    public string? LanguageCode { get; set; }
}
