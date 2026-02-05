namespace Backend.Services.Models;

public sealed record MediasoupConsumerResult(
    string MediasoupConsumerId,
    string MediasoupProducerId,
    string RtpParameters);
