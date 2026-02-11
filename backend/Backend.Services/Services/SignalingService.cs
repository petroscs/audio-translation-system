using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Backend.Services.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Services;

public sealed class SignalingService : ISignalingService
{
    private readonly AppDbContext _dbContext;
    private readonly IMediasoupService _mediasoupService;
    private readonly ISttWorkerService _sttWorkerService;
    private readonly IRecordingWorkerService _recordingWorkerService;
    private readonly IActiveProducerNotifier _activeProducerNotifier;

    public SignalingService(
        AppDbContext dbContext,
        IMediasoupService mediasoupService,
        ISttWorkerService sttWorkerService,
        IRecordingWorkerService recordingWorkerService,
        IActiveProducerNotifier activeProducerNotifier)
    {
        _dbContext = dbContext;
        _mediasoupService = mediasoupService;
        _sttWorkerService = sttWorkerService;
        _recordingWorkerService = recordingWorkerService;
        _activeProducerNotifier = activeProducerNotifier;
    }

    public async Task<SignalingTransportResult> CreateTransportAsync(
        Guid sessionId,
        Guid userId,
        bool isAdmin,
        TransportDirection direction,
        CancellationToken cancellationToken)
    {
        var session = await _dbContext.Sessions.FirstOrDefaultAsync(
            candidate => candidate.Id == sessionId,
            cancellationToken);

        EnsureSessionActive(session, userId, isAdmin);

        var transportResult = await _mediasoupService.CreateTransportAsync(
            sessionId,
            session!.EventId,
            session.ChannelId,
            direction,
            cancellationToken);

        var transport = new Transport
        {
            Id = Guid.NewGuid(),
            SessionId = session!.Id,
            MediasoupTransportId = transportResult.MediasoupTransportId,
            Direction = direction,
            IceParameters = transportResult.IceParameters,
            DtlsParameters = transportResult.DtlsParameters,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Transports.Add(transport);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new SignalingTransportResult(
            transport.Id,
            transport.MediasoupTransportId,
            transport.IceParameters,
            transportResult.IceCandidates,
            transport.DtlsParameters);
    }

    public async Task ConnectTransportAsync(
        Guid transportId,
        Guid userId,
        bool isAdmin,
        string dtlsParameters,
        CancellationToken cancellationToken)
    {
        var transport = await _dbContext.Transports
            .Include(candidate => candidate.Session)
            .FirstOrDefaultAsync(candidate => candidate.Id == transportId, cancellationToken);

        EnsureTransportActive(transport, userId, isAdmin);

        await _mediasoupService.ConnectTransportAsync(
            transport!.MediasoupTransportId,
            dtlsParameters,
            cancellationToken);

        transport.DtlsParameters = dtlsParameters;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<SignalingProducerResult> ProduceAsync(
        Guid transportId,
        Guid userId,
        bool isAdmin,
        MediaKind kind,
        string rtpParameters,
        CancellationToken cancellationToken)
    {
        var transport = await _dbContext.Transports
            .Include(candidate => candidate.Session)
            .FirstOrDefaultAsync(candidate => candidate.Id == transportId, cancellationToken);

        EnsureTransportActive(transport, userId, isAdmin);
        EnsureRole(transport!.Session, SessionRole.Translator, isAdmin);

        if (!isAdmin && transport.Direction != TransportDirection.Send)
        {
            throw new InvalidOperationException("Transport must be send direction to produce.");
        }

        var producerResult = await _mediasoupService.CreateProducerAsync(
            transport.MediasoupTransportId,
            kind,
            rtpParameters,
            cancellationToken);

        var producer = new Producer
        {
            Id = Guid.NewGuid(),
            SessionId = transport.SessionId,
            MediasoupProducerId = producerResult.MediasoupProducerId,
            Kind = kind,
            RtpParameters = rtpParameters,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Producers.Add(producer);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _ = Task.Run(async () =>
        {
            try
            {
                await _sttWorkerService.StartAsync(
                    transport.SessionId,
                    transport.Session.EventId,
                    transport.Session.ChannelId,
                    producer.Id,
                    producer.MediasoupProducerId,
                    CancellationToken.None);
            }
            catch
            {
                // STT worker may be unavailable; captions will be disabled
            }
        });

        _ = Task.Run(async () =>
        {
            try
            {
                await _recordingWorkerService.StartAsync(
                    transport.SessionId,
                    transport.Session.EventId,
                    transport.Session.ChannelId,
                    producer.Id,
                    producer.MediasoupProducerId,
                    CancellationToken.None);
            }
            catch
            {
                // Recording worker may be unavailable; recording will be skipped
            }
        });

        _ = Task.Run(async () =>
        {
            try
            {
                await _activeProducerNotifier.NotifyActiveProducerChangedAsync(
                    transport.SessionId,
                    producer.Id,
                    CancellationToken.None);
            }
            catch
            {
                // Notification failures should not block producer creation.
            }
        });

        return new SignalingProducerResult(producer.Id, producer.MediasoupProducerId);
    }

    public async Task<SignalingConsumerResult> ConsumeAsync(
        Guid transportId,
        Guid userId,
        bool isAdmin,
        Guid producerId,
        CancellationToken cancellationToken)
    {
        var transport = await _dbContext.Transports
            .Include(candidate => candidate.Session)
            .FirstOrDefaultAsync(candidate => candidate.Id == transportId, cancellationToken);

        EnsureTransportActive(transport, userId, isAdmin);
        EnsureRole(transport!.Session, SessionRole.Listener, isAdmin);

        if (!isAdmin && transport.Direction != TransportDirection.Receive)
        {
            throw new InvalidOperationException("Transport must be receive direction to consume.");
        }

        var producer = await _dbContext.Producers
            .Include(candidate => candidate.Session)
            .FirstOrDefaultAsync(candidate => candidate.Id == producerId, cancellationToken);

        if (producer is null)
        {
            throw new InvalidOperationException("Producer not found.");
        }

        if (!isAdmin && producer.Session.ChannelId != transport.Session.ChannelId)
        {
            throw new InvalidOperationException("Producer is not in the same channel.");
        }

        var consumerResult = await _mediasoupService.CreateConsumerAsync(
            transport.MediasoupTransportId,
            producer.MediasoupProducerId,
            cancellationToken);

        var consumer = new Consumer
        {
            Id = Guid.NewGuid(),
            SessionId = transport.SessionId,
            ProducerId = producer.Id,
            MediasoupConsumerId = consumerResult.MediasoupConsumerId,
            Kind = producer.Kind,
            RtpParameters = consumerResult.RtpParameters,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Consumers.Add(consumer);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new SignalingConsumerResult(
            consumer.Id,
            consumer.MediasoupConsumerId,
            consumerResult.MediasoupProducerId,
            consumerResult.RtpParameters);
    }

    private static void EnsureSessionActive(Session? session, Guid userId, bool isAdmin)
    {
        if (session is null)
        {
            throw new InvalidOperationException("Session not found.");
        }

        if (session.Status != SessionStatus.Active)
        {
            throw new InvalidOperationException("Session is not active.");
        }

        if (!isAdmin && session.UserId != userId)
        {
            throw new InvalidOperationException("Session does not belong to the user.");
        }
    }

    private static void EnsureTransportActive(Transport? transport, Guid userId, bool isAdmin)
    {
        if (transport is null)
        {
            throw new InvalidOperationException("Transport not found.");
        }

        EnsureSessionActive(transport.Session, userId, isAdmin);
    }

    private static void EnsureRole(Session session, SessionRole requiredRole, bool isAdmin)
    {
        if (!isAdmin && session.Role != requiredRole)
        {
            throw new InvalidOperationException($"Session role must be {requiredRole}.");
        }
    }
}
