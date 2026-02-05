using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Services;

public sealed class RecordingService : IRecordingService
{
    private readonly AppDbContext _dbContext;

    public RecordingService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Recording> CompleteRecordingAsync(Guid sessionId, string filePath, int durationSeconds, CancellationToken cancellationToken = default)
    {
        var session = await _dbContext.Sessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session is null)
        {
            throw new InvalidOperationException("Session not found.");
        }

        var recording = new Recording
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            FilePath = filePath ?? string.Empty,
            DurationSeconds = durationSeconds,
            StartedAt = session.StartedAt,
            EndedAt = DateTime.UtcNow,
            Status = RecordingStatus.Completed
        };

        _dbContext.Recordings.Add(recording);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return recording;
    }

    public async Task<Recording?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Recordings
            .AsNoTracking()
            .Include(r => r.Session)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<Recording?> GetBySessionIdAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Recordings
            .AsNoTracking()
            .Include(r => r.Session)
            .Where(r => r.SessionId == sessionId)
            .OrderByDescending(r => r.EndedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Recording>> GetAsync(Guid? eventId, Guid? channelId, Guid? sessionId, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Recordings
            .AsNoTracking()
            .Include(r => r.Session)
            .AsQueryable();

        if (eventId.HasValue)
        {
            query = query.Where(r => r.Session.EventId == eventId.Value);
        }

        if (channelId.HasValue)
        {
            query = query.Where(r => r.Session.ChannelId == channelId.Value);
        }

        if (sessionId.HasValue)
        {
            query = query.Where(r => r.SessionId == sessionId.Value);
        }

        return await query
            .OrderByDescending(r => r.EndedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var recording = await _dbContext.Recordings.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (recording is null)
        {
            return false;
        }

        _dbContext.Recordings.Remove(recording);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
