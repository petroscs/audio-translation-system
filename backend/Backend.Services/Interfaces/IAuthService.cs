using Backend.Services.Models;

namespace Backend.Services.Interfaces;

public interface IAuthService
{
    Task<AuthTokens?> LoginAsync(string usernameOrEmail, string password, string ipAddress, CancellationToken cancellationToken);
    Task<AuthTokens?> RefreshAsync(string refreshToken, string ipAddress, CancellationToken cancellationToken);
    Task<bool> RevokeRefreshTokenAsync(string refreshToken, string ipAddress, CancellationToken cancellationToken);
}
