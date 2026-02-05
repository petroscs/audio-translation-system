using Backend.Models.Entities;

namespace Backend.Services.Interfaces;

public interface IEventService
{
    Task<IReadOnlyList<Event>> GetAllAsync(CancellationToken cancellationToken);
    Task<Event?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Event> CreateAsync(
        Guid createdByUserId,
        string name,
        string? description,
        DateTime? startTime,
        DateTime? endTime,
        CancellationToken cancellationToken);
    Task<Event?> UpdateAsync(
        Guid id,
        string? name,
        string? description,
        DateTime? startTime,
        DateTime? endTime,
        CancellationToken cancellationToken);
    Task<Event?> StartAsync(Guid id, CancellationToken cancellationToken);
    Task<Event?> StopAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
