using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Services;

public sealed class ChannelService : IChannelService
{
    private readonly AppDbContext _dbContext;

    public ChannelService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Channel>> GetByEventAsync(Guid eventId, CancellationToken cancellationToken)
    {
        return await _dbContext.Channels
            .AsNoTracking()
            .Where(channel => channel.EventId == eventId)
            .OrderBy(channel => channel.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Channel?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Channels
            .AsNoTracking()
            .FirstOrDefaultAsync(channel => channel.Id == id, cancellationToken);
    }

    public async Task<Channel?> CreateAsync(Guid eventId, string name, string languageCode, CancellationToken cancellationToken)
    {
        var normalizedName = name.Trim();
        var normalizedLanguage = languageCode.Trim();
        var duplicate = await _dbContext.Channels.AnyAsync(
            channel => channel.EventId == eventId
                && channel.Name == normalizedName
                && channel.LanguageCode == normalizedLanguage,
            cancellationToken);

        if (duplicate)
        {
            return null;
        }

        var entity = new Channel
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Name = normalizedName,
            LanguageCode = normalizedLanguage,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Channels.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<bool> ExistsAsync(
        Guid eventId,
        string name,
        string languageCode,
        Guid? excludeId,
        CancellationToken cancellationToken)
    {
        var normalizedName = name.Trim();
        var normalizedLanguage = languageCode.Trim();

        var query = _dbContext.Channels.AsQueryable()
            .Where(channel => channel.EventId == eventId
                && channel.Name == normalizedName
                && channel.LanguageCode == normalizedLanguage);

        if (excludeId.HasValue)
        {
            query = query.Where(channel => channel.Id != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public async Task<Channel?> UpdateAsync(Guid id, string? name, string? languageCode, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Channels.FirstOrDefaultAsync(channel => channel.Id == id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            entity.Name = name.Trim();
        }

        if (!string.IsNullOrWhiteSpace(languageCode))
        {
            entity.LanguageCode = languageCode.Trim();
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Channels.FirstOrDefaultAsync(channel => channel.Id == id, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        _dbContext.Channels.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
