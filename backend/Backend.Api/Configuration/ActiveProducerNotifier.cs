using Backend.Api.Hubs;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Api.Configuration;

public sealed class ActiveProducerNotifier : IActiveProducerNotifier
{
    private readonly IHubContext<SignalingHub> _hubContext;

    public ActiveProducerNotifier(IHubContext<SignalingHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task NotifyActiveProducerChangedAsync(
        Guid sessionId,
        Guid producerId,
        CancellationToken cancellationToken = default)
    {
        var groupName = $"session:{sessionId}";
        return _hubContext.Clients.Group(groupName)
            .SendAsync("ActiveProducerChanged", sessionId, producerId, cancellationToken);
    }
}
