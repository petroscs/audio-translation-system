using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Contracts.Events;

public sealed class UpdateEventRequest
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
}
