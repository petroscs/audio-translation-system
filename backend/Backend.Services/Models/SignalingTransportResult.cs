namespace Backend.Services.Models;

public sealed record SignalingTransportResult(
    Guid TransportId,
    string MediasoupTransportId,
    string IceParameters,
    string IceCandidates,
    string DtlsParameters);
