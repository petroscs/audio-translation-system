namespace Backend.Services.Interfaces;

public interface ISttWorkerService
{
    Task StartAsync(Guid sessionId, Guid channelId, Guid producerId, string mediasoupProducerId, CancellationToken cancellationToken = default);

    Task StopAsync(Guid sessionId, CancellationToken cancellationToken = default);
}
