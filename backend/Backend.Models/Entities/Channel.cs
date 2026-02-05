namespace Backend.Models.Entities;

public sealed class Channel
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string LanguageCode { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Event Event { get; set; } = null!;
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
