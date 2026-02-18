namespace Backend.Services.Models;

public sealed record ActiveBroadcastItem(
    Guid BroadcastSessionId,
    string EventName,
    string ChannelName);
