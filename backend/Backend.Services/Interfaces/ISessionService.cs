using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Services.Models;

namespace Backend.Services.Interfaces;

public interface ISessionService
{
    Task<IReadOnlyList<Session>> GetAsync(
        Guid? eventId,
        Guid? channelId,
        SessionStatus? status,
        CancellationToken cancellationToken);
    Task<Session?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Session?> CreateAsync(
        Guid userId,
        Guid eventId,
        Guid channelId,
        SessionRole role,
        CancellationToken cancellationToken);
    Task<Session?> EndAsync(Guid id, CancellationToken cancellationToken);
    /// <summary>
    /// Ends all active listener sessions that were consuming from the given broadcast (translator) session.
    /// Called from a fresh scope when a translator session ends so DbContext is valid.
    /// </summary>
    Task EndListenerSessionsForBroadcastAsync(Guid broadcastSessionId, CancellationToken cancellationToken);
    Task PauseBroadcastAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task<SessionActiveProducerResult?> GetActiveProducerJoinInfoAsync(Guid sessionId, CancellationToken cancellationToken);
}
