namespace Backend.Api.Contracts.Channels;

public sealed class ChannelResponse
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string LanguageCode { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
