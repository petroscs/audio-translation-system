using Backend.Models.Enums;

namespace Backend.Models.Entities;

public sealed class Session
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid EventId { get; set; }
    public Guid ChannelId { get; set; }
    public SessionRole Role { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public SessionStatus Status { get; set; }

    public User User { get; set; } = null!;
    public Event Event { get; set; } = null!;
    public Channel Channel { get; set; } = null!;
    public ICollection<Producer> Producers { get; set; } = new List<Producer>();
    public ICollection<Consumer> Consumers { get; set; } = new List<Consumer>();
    public ICollection<Recording> Recordings { get; set; } = new List<Recording>();
    public ICollection<Caption> Captions { get; set; } = new List<Caption>();
    public ICollection<Transport> Transports { get; set; } = new List<Transport>();
}
