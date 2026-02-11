namespace Backend.Services.Interfaces;

public interface IActiveProducerNotifier
{
    Task NotifyActiveProducerChangedAsync(
        Guid sessionId,
        Guid producerId,
        CancellationToken cancellationToken = default);
}
