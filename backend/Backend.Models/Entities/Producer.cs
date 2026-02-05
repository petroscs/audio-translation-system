using Backend.Models.Enums;

namespace Backend.Models.Entities;

public sealed class Producer
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string MediasoupProducerId { get; set; } = string.Empty;
    public MediaKind Kind { get; set; }
    public string RtpParameters { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Session Session { get; set; } = null!;
    public ICollection<Consumer> Consumers { get; set; } = new List<Consumer>();
}
