using Backend.Models.Entities;

namespace Backend.Services.Interfaces;

public interface IRecordingService
{
    Task<Recording> CompleteRecordingAsync(Guid sessionId, string filePath, int durationSeconds, CancellationToken cancellationToken = default);

    Task<Recording?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Recording?> GetBySessionIdAsync(Guid sessionId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Recording>> GetAsync(Guid? eventId, Guid? channelId, Guid? sessionId, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
