using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Backend.Services.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services.Services;

public sealed class ListenService : IListenService
{
    private const int GuestTokenMinutes = 120;

    private readonly AppDbContext _dbContext;
    private readonly ISessionService _sessionService;
    private readonly IEventService _eventService;
    private readonly IChannelService _channelService;
    private readonly JwtSettings _jwtSettings;
    private readonly ListenSettings _listenSettings;
    private readonly JwtSecurityTokenHandler _tokenHandler = new();

    public ListenService(
        AppDbContext dbContext,
        ISessionService sessionService,
        IEventService eventService,
        IChannelService channelService,
        IOptions<JwtSettings> jwtOptions,
        IOptions<ListenSettings> listenOptions)
    {
        _dbContext = dbContext;
        _sessionService = sessionService;
        _eventService = eventService;
        _channelService = channelService;
        _jwtSettings = jwtOptions.Value;
        _listenSettings = listenOptions.Value;
    }

    public async Task<IReadOnlyList<ActiveBroadcastItem>> GetActiveBroadcastsAsync(CancellationToken cancellationToken = default)
    {
        if (!_listenSettings.AnonymousEnabled)
        {
            return Array.Empty<ActiveBroadcastItem>();
        }

        // Session IDs that have at least one producer (translator is broadcasting)
        var sessionIdsWithProducers = await _dbContext.Producers
            .AsNoTracking()
            .Select(p => p.SessionId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (sessionIdsWithProducers.Count == 0)
        {
            return Array.Empty<ActiveBroadcastItem>();
        }

        var sessions = await _dbContext.Sessions
            .AsNoTracking()
            .Where(s => sessionIdsWithProducers.Contains(s.Id)
                && s.Status == SessionStatus.Active
                && s.Role == SessionRole.Translator)
            .Include(s => s.Event)
            .Include(s => s.Channel)
            .OrderByDescending(s => s.StartedAt)
            .ToListAsync(cancellationToken);

        return sessions
            .Select(s => new ActiveBroadcastItem(s.Id, s.Event.Name, s.Channel.Name))
            .ToList();
    }

    public async Task<ListenJoinResult?> JoinAsync(Guid broadcastSessionId, CancellationToken cancellationToken = default)
    {
        if (!_listenSettings.AnonymousEnabled)
        {
            return null;
        }

        var joinInfo = await _sessionService.GetActiveProducerJoinInfoAsync(broadcastSessionId, cancellationToken);
        if (joinInfo is null)
        {
            return null;
        }

        var guestId = Guid.NewGuid();
        var guest = new User
        {
            Id = guestId,
            Username = $"guest-{guestId:N}",
            Email = $"guest-{guestId:N}@anonymous",
            Role = UserRole.Listener,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Convert.ToBase64String(Guid.NewGuid().ToByteArray())),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(guest);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var session = await _sessionService.CreateAsync(
            guestId,
            joinInfo.EventId,
            joinInfo.ChannelId,
            SessionRole.Listener,
            cancellationToken);

        if (session is null)
        {
            return null;
        }

        var accessToken = CreateAccessToken(guest);

        var evt = await _eventService.GetByIdAsync(joinInfo.EventId, cancellationToken);
        var channel = await _channelService.GetByIdAsync(joinInfo.ChannelId, cancellationToken);

        return new ListenJoinResult(
            accessToken,
            session.Id,
            joinInfo.ProducerId,
            joinInfo.EventId,
            joinInfo.ChannelId,
            evt?.Name,
            channel?.Name);
    }

    private string CreateAccessToken(User user)
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

        var expiresAt = DateTime.UtcNow.AddMinutes(GuestTokenMinutes);
        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return _tokenHandler.WriteToken(token);
    }
}
