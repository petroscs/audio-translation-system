using Backend.Models.Enums;

namespace Backend.Models.Entities;

public sealed class Recording
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public int? DurationSeconds { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public RecordingStatus Status { get; set; }

    public Session Session { get; set; } = null!;
}
