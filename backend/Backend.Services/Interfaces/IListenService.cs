using Backend.Services.Models;

namespace Backend.Services.Interfaces;

public interface IListenService
{
    Task<IReadOnlyList<ActiveBroadcastItem>> GetActiveBroadcastsAsync(CancellationToken cancellationToken = default);
    Task<ListenJoinResult?> JoinAsync(Guid broadcastSessionId, CancellationToken cancellationToken = default);
}
