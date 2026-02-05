namespace Backend.Services.Models;

public sealed record SignalingConsumerResult(
    Guid ConsumerId,
    string MediasoupConsumerId,
    string MediasoupProducerId,
    string RtpParameters);
