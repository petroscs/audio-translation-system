namespace Backend.Api.Contracts.Signaling;

public sealed class TransportCreatedResponse
{
    public Guid TransportId { get; set; }
    public string MediasoupTransportId { get; set; } = string.Empty;
    public string IceParameters { get; set; } = string.Empty;
    public string IceCandidates { get; set; } = string.Empty;
    public string DtlsParameters { get; set; } = string.Empty;
}
