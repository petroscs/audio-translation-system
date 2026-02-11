using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Backend.Services.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Services;

public sealed class SessionService : ISessionService
{
    private readonly AppDbContext _dbContext;
    private readonly ISttWorkerService _sttWorkerService;
    private readonly IRecordingWorkerService _recordingWorkerService;

    public SessionService(AppDbContext dbContext, ISttWorkerService sttWorkerService, IRecordingWorkerService recordingWorkerService)
    {
        _dbContext = dbContext;
        _sttWorkerService = sttWorkerService;
        _recordingWorkerService = recordingWorkerService;
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

        return entity;
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
