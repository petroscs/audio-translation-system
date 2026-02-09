namespace Backend.Services.Interfaces;

public interface IRecordingWorkerService
{
    Task StartAsync(Guid sessionId, Guid eventId, Guid channelId, Guid producerId, string mediasoupProducerId, CancellationToken cancellationToken = default);

    Task StopAsync(Guid sessionId, CancellationToken cancellationToken = default);
}
