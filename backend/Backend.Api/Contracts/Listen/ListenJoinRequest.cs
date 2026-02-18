using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Contracts.Listen;

public sealed class ListenJoinRequest
{
    [Required]
    public Guid BroadcastSessionId { get; set; }
}
