namespace Backend.Api.Contracts.Signaling;

public sealed class ProducerCreatedResponse
{
    public Guid ProducerId { get; set; }
    public string MediasoupProducerId { get; set; } = string.Empty;
}
