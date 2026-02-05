using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Contracts.Signaling;

public sealed class ConsumeRequest
{
    [Required]
    public Guid TransportId { get; set; }

    [Required]
    public Guid ProducerId { get; set; }
}
