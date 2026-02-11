namespace Backend.Api.Contracts.Sessions;

public sealed class SessionActiveProducerResponse
{
    public Guid ProducerId { get; set; }
    public Guid EventId { get; set; }
    public Guid ChannelId { get; set; }
}
