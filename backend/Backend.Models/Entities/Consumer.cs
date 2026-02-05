using Backend.Models.Enums;

namespace Backend.Models.Entities;

public sealed class Consumer
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid ProducerId { get; set; }
    public string MediasoupConsumerId { get; set; } = string.Empty;
    public MediaKind Kind { get; set; }
    public string RtpParameters { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Session Session { get; set; } = null!;
    public Producer Producer { get; set; } = null!;
}
