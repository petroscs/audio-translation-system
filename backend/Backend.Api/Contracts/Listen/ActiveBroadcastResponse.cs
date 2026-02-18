namespace Backend.Api.Contracts.Listen;

public sealed class ActiveBroadcastResponse
{
    public Guid BroadcastSessionId { get; set; }
    public string EventName { get; set; } = string.Empty;
    public string ChannelName { get; set; } = string.Empty;
}
