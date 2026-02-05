using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Services;

public sealed class CaptionService : ICaptionService
{
    private readonly AppDbContext _dbContext;
    private readonly ICaptionBroadcaster _captionBroadcaster;

    public CaptionService(AppDbContext dbContext, ICaptionBroadcaster captionBroadcaster)
    {
        _dbContext = dbContext;
        _captionBroadcaster = captionBroadcaster;
    }

    public async Task AddCaptionAsync(Guid sessionId, string text, long timestamp, double? confidence, CancellationToken cancellationToken = default)
    {
        var session = await _dbContext.Sessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session is null)
        {
            throw new InvalidOperationException("Session not found.");
        }

        if (session.Status != SessionStatus.Active)
        {
            throw new InvalidOperationException("Session is not active.");
        }

        var caption = new Caption
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            Text = text ?? string.Empty,
            Timestamp = timestamp,
            Confidence = confidence,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Captions.Add(caption);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var captionDto = new
        {
            type = "caption",
            sessionId = sessionId.ToString(),
            text = caption.Text,
            timestamp = caption.Timestamp,
            confidence = caption.Confidence
        };

        await _captionBroadcaster.BroadcastAsync(sessionId, captionDto, cancellationToken);
    }

    public async Task<IReadOnlyList<CaptionDto>> GetSessionCaptionsAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Captions
            .AsNoTracking()
            .Where(c => c.SessionId == sessionId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CaptionDto(c.Id, c.Text, c.Timestamp, c.Confidence, c.CreatedAt))
            .ToListAsync(cancellationToken);
    }
}
