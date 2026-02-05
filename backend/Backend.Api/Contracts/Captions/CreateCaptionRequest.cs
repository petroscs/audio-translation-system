namespace Backend.Api.Contracts.Captions;

public sealed record CreateCaptionRequest(
    Guid SessionId,
    string Text,
    long Timestamp,
    double? Confidence);
