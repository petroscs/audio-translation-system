using Backend.Models.Enums;

namespace Backend.Api.Contracts.Sessions;

public sealed class SessionResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid EventId { get; set; }
    public Guid ChannelId { get; set; }
    public SessionRole Role { get; set; }
    public SessionStatus Status { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
}
