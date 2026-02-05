namespace Backend.Api.Contracts.Signaling;

public sealed class ConsumerCreatedResponse
{
    public Guid ConsumerId { get; set; }
    public string MediasoupConsumerId { get; set; } = string.Empty;
    public string MediasoupProducerId { get; set; } = string.Empty;
    public string RtpParameters { get; set; } = string.Empty;
}
