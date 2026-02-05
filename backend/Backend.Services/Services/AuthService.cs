using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Services.Interfaces;
using Backend.Services.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services.Services;

public sealed class AuthService : IAuthService
{
    private readonly AppDbContext _dbContext;
    private readonly JwtSettings _jwtSettings;
    private readonly JwtSecurityTokenHandler _tokenHandler = new();

    public AuthService(AppDbContext dbContext, IOptions<JwtSettings> jwtOptions)
    {
        _dbContext = dbContext;
        _jwtSettings = jwtOptions.Value;
    }

    public async Task<AuthTokens?> LoginAsync(string usernameOrEmail, string password, string ipAddress, CancellationToken cancellationToken)
    {
        var normalizedIdentifier = usernameOrEmail.Trim().ToLower();
        var user = await _dbContext.Users.FirstOrDefaultAsync(
            candidate => candidate.Username.ToLower() == normalizedIdentifier
                || candidate.Email.ToLower() == normalizedIdentifier,
            cancellationToken);

        if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            return null;
        }

        return await CreateTokensAsync(user, ipAddress, cancellationToken);
    }

    public async Task<AuthTokens?> RefreshAsync(string refreshToken, string ipAddress, CancellationToken cancellationToken)
    {
        var tokenHash = HashToken(refreshToken);
        var storedToken = await _dbContext.RefreshTokens
            .Include(token => token.User)
            .FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancellationToken);

        if (storedToken is null || storedToken.RevokedAt.HasValue || storedToken.ExpiresAt <= DateTime.UtcNow)
        {
            return null;
        }

        storedToken.RevokedAt = DateTime.UtcNow;

        var newRefreshTokenValue = GenerateRefreshToken();
        var newRefreshToken = CreateRefreshToken(storedToken.UserId, newRefreshTokenValue);
        storedToken.ReplacedByTokenHash = newRefreshToken.TokenHash;

        _dbContext.RefreshTokens.Add(newRefreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var accessToken = CreateAccessToken(storedToken.User, out var expiresAt);
        return new AuthTokens(accessToken, newRefreshTokenValue, expiresAt);
    }

    public async Task<bool> RevokeRefreshTokenAsync(string refreshToken, string ipAddress, CancellationToken cancellationToken)
    {
        var tokenHash = HashToken(refreshToken);
        var storedToken = await _dbContext.RefreshTokens.FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancellationToken);
        if (storedToken is null || storedToken.RevokedAt.HasValue)
        {
            return false;
        }

        storedToken.RevokedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<AuthTokens> CreateTokensAsync(User user, string ipAddress, CancellationToken cancellationToken)
    {
        var refreshTokenValue = GenerateRefreshToken();
        var refreshToken = CreateRefreshToken(user.Id, refreshTokenValue);
        _dbContext.RefreshTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var accessToken = CreateAccessToken(user, out var expiresAt);
        return new AuthTokens(accessToken, refreshTokenValue, expiresAt);
    }

    private string CreateAccessToken(User user, out DateTime expiresAt)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenMinutes);
        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return _tokenHandler.WriteToken(token);
    }

    private RefreshToken CreateRefreshToken(Guid userId, string refreshTokenValue)
    {
        return new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = HashToken(refreshTokenValue),
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenDays),
            CreatedAt = DateTime.UtcNow
        };
    }

    private static string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }

    private static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hash);
    }
}
