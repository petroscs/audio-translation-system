using Backend.Models.Enums;

namespace Backend.Models.Entities;

public sealed class Transport
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string MediasoupTransportId { get; set; } = string.Empty;
    public TransportDirection Direction { get; set; }
    public string IceParameters { get; set; } = string.Empty;
    public string DtlsParameters { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Session Session { get; set; } = null!;
}
