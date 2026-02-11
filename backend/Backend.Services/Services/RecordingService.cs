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

        // Keep exactly one recording row per session.
        var existingRecordings = await _dbContext.Recordings
            .Where(r => r.SessionId == sessionId)
            .OrderByDescending(r => r.EndedAt)
            .ThenByDescending(r => r.StartedAt)
            .ToListAsync(cancellationToken);

        Recording recording;
        if (existingRecordings.Count > 0)
        {
            recording = existingRecordings[0];
            if (existingRecordings.Count > 1)
            {
                _dbContext.Recordings.RemoveRange(existingRecordings.Skip(1));
            }
        }
        else
        {
            recording = new Recording
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                StartedAt = session.StartedAt
            };
            _dbContext.Recordings.Add(recording);
        }

        recording.FilePath = filePath ?? string.Empty;
        recording.DurationSeconds = durationSeconds;
        recording.EndedAt = DateTime.UtcNow;
        recording.Status = RecordingStatus.Completed;

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

        var recordings = await query
            .OrderByDescending(r => r.EndedAt)
            .ToListAsync(cancellationToken);

        // Display one recording per session in list endpoints.
        return recordings
            .GroupBy(r => r.SessionId)
            .Select(group => group.First())
            .OrderByDescending(r => r.EndedAt)
            .ToList();
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
