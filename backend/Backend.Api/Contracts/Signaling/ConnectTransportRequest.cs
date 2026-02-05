using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Contracts.Signaling;

public sealed class ConnectTransportRequest
{
    [Required]
    public Guid TransportId { get; set; }

    [Required]
    public string DtlsParameters { get; set; } = string.Empty;
}
