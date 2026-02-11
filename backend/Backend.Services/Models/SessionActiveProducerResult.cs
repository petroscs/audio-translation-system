namespace Backend.Services.Models;

public sealed record SessionActiveProducerResult(
    Guid ProducerId,
    Guid EventId,
    Guid ChannelId);
