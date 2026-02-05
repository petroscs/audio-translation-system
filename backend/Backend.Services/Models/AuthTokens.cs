namespace Backend.Services.Models;

public sealed record AuthTokens(string AccessToken, string RefreshToken, DateTime ExpiresAt);
