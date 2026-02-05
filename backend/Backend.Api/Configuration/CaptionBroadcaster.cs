using Backend.Api.Hubs;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Api.Configuration;

public sealed class CaptionBroadcaster : ICaptionBroadcaster
{
    private readonly IHubContext<SignalingHub> _hubContext;

    public CaptionBroadcaster(IHubContext<SignalingHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task BroadcastAsync(Guid sessionId, object caption, CancellationToken cancellationToken = default)
    {
        var groupName = $"session:{sessionId}";
        return _hubContext.Clients.Group(groupName).SendAsync("Caption", caption, cancellationToken);
    }
}
