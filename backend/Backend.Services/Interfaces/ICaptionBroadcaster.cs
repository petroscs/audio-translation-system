namespace Backend.Services.Interfaces;

public interface ICaptionBroadcaster
{
    Task BroadcastAsync(Guid sessionId, object caption, CancellationToken cancellationToken = default);
}
