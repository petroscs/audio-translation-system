using Backend.Models.Entities;

namespace Backend.Services.Interfaces;

public interface IChannelService
{
    Task<IReadOnlyList<Channel>> GetByEventAsync(Guid eventId, CancellationToken cancellationToken);
    Task<Channel?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Channel?> CreateAsync(Guid eventId, string name, string languageCode, CancellationToken cancellationToken);
    Task<bool> ExistsAsync(Guid eventId, string name, string languageCode, Guid? excludeId, CancellationToken cancellationToken);
    Task<Channel?> UpdateAsync(Guid id, string? name, string? languageCode, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
