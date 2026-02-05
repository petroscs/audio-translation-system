namespace Backend.Services.Models;

public sealed record MediasoupTransportResult(
    string MediasoupTransportId,
    string IceParameters,
    string DtlsParameters);
