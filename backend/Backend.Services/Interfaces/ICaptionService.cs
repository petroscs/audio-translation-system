namespace Backend.Services.Interfaces;

public interface ICaptionService
{
    Task AddCaptionAsync(Guid sessionId, string text, long timestamp, double? confidence, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CaptionDto>> GetSessionCaptionsAsync(Guid sessionId, CancellationToken cancellationToken = default);
}

public sealed record CaptionDto(Guid Id, string Text, long Timestamp, double? Confidence, DateTime CreatedAt);
