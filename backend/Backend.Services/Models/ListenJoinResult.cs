namespace Backend.Services.Models;

public sealed record ListenJoinResult(
    string AccessToken,
    Guid ListenerSessionId,
    Guid ProducerId,
    Guid EventId,
    Guid ChannelId,
    string? EventName,
    string? ChannelName);
