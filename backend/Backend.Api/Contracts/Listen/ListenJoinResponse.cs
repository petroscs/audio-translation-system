namespace Backend.Api.Contracts.Listen;

public sealed class ListenJoinResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public Guid ListenerSessionId { get; set; }
    public Guid ProducerId { get; set; }
    public Guid EventId { get; set; }
    public Guid ChannelId { get; set; }
    public string? EventName { get; set; }
    public string? ChannelName { get; set; }
}
