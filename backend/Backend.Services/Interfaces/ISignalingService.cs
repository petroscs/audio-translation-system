using Backend.Models.Enums;
using Backend.Services.Models;

namespace Backend.Services.Interfaces;

public interface ISignalingService
{
    Task<SignalingTransportResult> CreateTransportAsync(
        Guid sessionId,
        Guid userId,
        bool isAdmin,
        TransportDirection direction,
        CancellationToken cancellationToken);

    Task ConnectTransportAsync(
        Guid transportId,
        Guid userId,
        bool isAdmin,
        string dtlsParameters,
        CancellationToken cancellationToken);

    Task<SignalingProducerResult> ProduceAsync(
        Guid transportId,
        Guid userId,
        bool isAdmin,
        MediaKind kind,
        string rtpParameters,
        CancellationToken cancellationToken);

    Task<SignalingConsumerResult> ConsumeAsync(
        Guid transportId,
        Guid userId,
        bool isAdmin,
        Guid producerId,
        CancellationToken cancellationToken);
}
