using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Api.Contracts.Sessions;

public sealed class CreateSessionRequest
{
    [Required]
    public Guid EventId { get; set; }

    [Required]
    public Guid ChannelId { get; set; }

    [Required]
    public SessionRole Role { get; set; }
}
