using Backend.Models.Enums;

namespace Backend.Models.Entities;

public sealed class Event
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public EventStatus Status { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User CreatedByUser { get; set; } = null!;
    public ICollection<Channel> Channels { get; set; } = new List<Channel>();
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
