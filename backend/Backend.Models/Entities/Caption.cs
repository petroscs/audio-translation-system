namespace Backend.Models.Entities;

public sealed class Caption
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string Text { get; set; } = string.Empty;
    public long Timestamp { get; set; }
    public double? Confidence { get; set; }
    public DateTime CreatedAt { get; set; }

    public Session Session { get; set; } = null!;
}
