namespace Backend.Api.Contracts.Sessions;

public sealed record CaptionResponse(Guid Id, string Text, long Timestamp, double? Confidence, DateTime CreatedAt);
