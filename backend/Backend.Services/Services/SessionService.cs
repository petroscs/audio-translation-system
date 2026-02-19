using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Backend.Services.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Services.Services;

public sealed class SessionService : ISessionService
{
    private readonly AppDbContext _dbContext;
    private readonly ISttWorkerService _sttWorkerService;
    private readonly IRecordingWorkerService _recordingWorkerService;
    private readonly IServiceScopeFactory _scopeFactory;

    public SessionService(
        AppDbContext dbContext,
        ISttWorkerService sttWorkerService,
        IRecordingWorkerService recordingWorkerService,
        IServiceScopeFactory scopeFactory)
    {
        _dbContext = dbContext;
        _sttWorkerService = sttWorkerService;
        _recordingWorkerService = recordingWorkerService;
        _scopeFactory = scopeFactory;
    }

    public async Task<IReadOnlyList<Session>> GetAsync(
        Guid? eventId,
        Guid? channelId,
        SessionStatus? status,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Sessions.AsNoTracking();

        if (eventId.HasValue)
        {
            query = query.Where(session => session.EventId == eventId.Value);
        }

        if (channelId.HasValue)
        {
            query = query.Where(session => session.ChannelId == channelId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(session => session.Status == status.Value);
        }

        return await query
            .OrderByDescending(session => session.StartedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Session?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Sessions
            .AsNoTracking()
            .FirstOrDefaultAsync(session => session.Id == id, cancellationToken);
    }

    public async Task<Session?> CreateAsync(
        Guid userId,
        Guid eventId,
        Guid channelId,
        SessionRole role,
        CancellationToken cancellationToken)
    {
        var channel = await _dbContext.Channels
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == channelId, cancellationToken);

        if (channel is null || channel.EventId != eventId)
        {
            return null;
        }

        var existingActive = await _dbContext.Sessions
            .FirstOrDefaultAsync(
                session => session.UserId == userId
                    && session.ChannelId == channelId
                    && session.Status == SessionStatus.Active,
                cancellationToken);

        if (existingActive is not null)
        {
            return existingActive;
        }

        var entity = new Session
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventId = eventId,
            ChannelId = channelId,
            Role = role,
            Status = SessionStatus.Active,
            StartedAt = DateTime.UtcNow
        };

        _dbContext.Sessions.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<Session?> EndAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Sessions.FirstOrDefaultAsync(session => session.Id == id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var wasTranslatorSession = entity.Role == SessionRole.Translator;

        entity.Status = SessionStatus.Ended;
        entity.EndedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        _ = Task.Run(async () =>
        {
            try
            {
                await _sttWorkerService.StopAsync(id, CancellationToken.None);
            }
            catch
            {
                // STT worker may be unavailable; ignore
            }
        });

        _ = Task.Run(async () =>
        {
            try
            {
                await _recordingWorkerService.StopAsync(id, CancellationToken.None);
            }
            catch
            {
                // Recording worker may be unavailable; ignore
            }
        });

        // When a translator (broadcast) session ends, end all listener sessions and remove guest users.
        // Run synchronously (with a new scope) so cleanup completes before the response is sent;
        // fire-and-forget Task.Run can be dropped in Docker/some hosts and never run.
        if (wasTranslatorSession)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var sessionService = scope.ServiceProvider.GetRequiredService<ISessionService>();
                await sessionService.EndListenerSessionsForBroadcastAsync(id, cancellationToken);
            }
            catch (Exception ex)
            {
                // Log but do not fail the end-session response
                // TODO: inject ILogger and log ex when available
            }
        }

        return entity;
    }

    /// <inheritdoc />
    public async Task EndListenerSessionsForBroadcastAsync(Guid broadcastSessionId, CancellationToken cancellationToken)
    {
        var producerIds = await _dbContext.Producers
            .Where(p => p.SessionId == broadcastSessionId)
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);

        if (producerIds.Count == 0)
        {
            return;
        }

        var listenerSessionIds = await _dbContext.Consumers
            .Where(c => producerIds.Contains(c.ProducerId))
            .Select(c => c.SessionId)
            .Distinct()
            .ToListAsync(cancellationToken);

        foreach (var listenerSessionId in listenerSessionIds)
        {
            if (listenerSessionId == broadcastSessionId)
            {
                continue;
            }

            var listener = await _dbContext.Sessions
                .FirstOrDefaultAsync(
                    s => s.Id == listenerSessionId
                        && s.Role == SessionRole.Listener
                        && s.Status == SessionStatus.Active,
                    cancellationToken);

            if (listener is not null)
            {
                await EndAsync(listenerSessionId, cancellationToken);
            }
        }

        // Delete guest users (and their listener sessions) created for this broadcast to avoid user table bloat.
        // Guest users are created by ListenService.JoinAsync with Role=Listener and Email ending with "@anonymous".
        var listenerUserIds = await _dbContext.Sessions
            .Where(s => listenerSessionIds.Contains(s.Id))
            .Select(s => s.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (listenerUserIds.Count == 0)
        {
            return;
        }

        var guestUserIds = await _dbContext.Users
            .Where(u => listenerUserIds.Contains(u.Id)
                && u.Role == UserRole.Listener
                && u.Email.EndsWith("@anonymous"))
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

        if (guestUserIds.Count == 0)
        {
            return;
        }

        var guestSessionsToRemove = await _dbContext.Sessions
            .Where(s => listenerSessionIds.Contains(s.Id) && guestUserIds.Contains(s.UserId))
            .ToListAsync(cancellationToken);

        _dbContext.Sessions.RemoveRange(guestSessionsToRemove);
        var guestUsersToRemove = await _dbContext.Users
            .Where(u => guestUserIds.Contains(u.Id))
            .ToListAsync(cancellationToken);
        _dbContext.Users.RemoveRange(guestUsersToRemove);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task PauseBroadcastAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _dbContext.Sessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session is null || session.Status != SessionStatus.Active)
        {
            return;
        }

        _ = Task.Run(async () =>
        {
            try
            {
                await _sttWorkerService.StopAsync(sessionId, CancellationToken.None);
            }
            catch
            {
                // STT worker may be unavailable; ignore
            }
        });

        _ = Task.Run(async () =>
        {
            try
            {
                await _recordingWorkerService.StopAsync(sessionId, CancellationToken.None);
            }
            catch
            {
                // Recording worker may be unavailable; ignore
            }
        });
    }

    public async Task<SessionActiveProducerResult?> GetActiveProducerJoinInfoAsync(Guid sessionId, CancellationToken cancellationToken)
    {
        var session = await _dbContext.Sessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session is null || session.Status != SessionStatus.Active)
        {
            return null;
        }

        var producer = await _dbContext.Producers
            .AsNoTracking()
            .Where(p => p.SessionId == sessionId)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (producer is null)
        {
            return null;
        }

        return new SessionActiveProducerResult(producer.Id, session.EventId, session.ChannelId);
    }
}
