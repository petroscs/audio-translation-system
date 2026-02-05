using Backend.Models.Entities;
using Backend.Models.Enums;

namespace Backend.Services.Interfaces;

public interface ISessionService
{
    Task<IReadOnlyList<Session>> GetAsync(
        Guid? eventId,
        Guid? channelId,
        SessionStatus? status,
        CancellationToken cancellationToken);
    Task<Session?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Session?> CreateAsync(
        Guid userId,
        Guid eventId,
        Guid channelId,
        SessionRole role,
        CancellationToken cancellationToken);
    Task<Session?> EndAsync(Guid id, CancellationToken cancellationToken);
}
