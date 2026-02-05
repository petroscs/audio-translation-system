using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Api.Contracts.Signaling;

public sealed class CreateTransportRequest
{
    [Required]
    public Guid SessionId { get; set; }

    [Required]
    public TransportDirection Direction { get; set; }
}
