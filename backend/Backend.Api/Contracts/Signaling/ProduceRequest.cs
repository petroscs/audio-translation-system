using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Api.Contracts.Signaling;

public sealed class ProduceRequest
{
    [Required]
    public Guid TransportId { get; set; }

    [Required]
    public MediaKind Kind { get; set; }

    [Required]
    public string RtpParameters { get; set; } = string.Empty;
}
