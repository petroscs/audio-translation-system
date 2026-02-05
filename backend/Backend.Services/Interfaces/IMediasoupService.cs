using Backend.Models.Enums;
using Backend.Services.Models;

namespace Backend.Services.Interfaces;

public interface IMediasoupService
{
    Task<MediasoupTransportResult> CreateTransportAsync(
        Guid sessionId,
        TransportDirection direction,
        CancellationToken cancellationToken);

    Task ConnectTransportAsync(
        string mediasoupTransportId,
        string dtlsParameters,
        CancellationToken cancellationToken);

    Task<MediasoupProducerResult> CreateProducerAsync(
        string mediasoupTransportId,
        MediaKind kind,
        string rtpParameters,
        CancellationToken cancellationToken);

    Task<MediasoupConsumerResult> CreateConsumerAsync(
        string mediasoupTransportId,
        string mediasoupProducerId,
        CancellationToken cancellationToken);
}
