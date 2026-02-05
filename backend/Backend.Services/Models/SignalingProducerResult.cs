namespace Backend.Services.Models;

public sealed record SignalingProducerResult(
    Guid ProducerId,
    string MediasoupProducerId);
