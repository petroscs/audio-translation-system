using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Services;

public sealed class EventService : IEventService
{
    private readonly AppDbContext _dbContext;

    public EventService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<Event>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Events
            .AsNoTracking()
            .OrderBy(evt => evt.StartTime ?? evt.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Event?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(evt => evt.Id == id, cancellationToken);
    }

    public async Task<Event> CreateAsync(
        Guid createdByUserId,
        string name,
        string? description,
        DateTime? startTime,
        DateTime? endTime,
        CancellationToken cancellationToken)
    {
        var entity = new Event
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            StartTime = startTime,
            EndTime = endTime,
            Status = EventStatus.Draft,
            CreatedByUserId = createdByUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Events.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<Event?> UpdateAsync(
        Guid id,
        string? name,
        string? description,
        DateTime? startTime,
        DateTime? endTime,
        CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Events.FirstOrDefaultAsync(evt => evt.Id == id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            entity.Name = name.Trim();
        }

        if (description is not null)
        {
            entity.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        }

        if (startTime.HasValue)
        {
            entity.StartTime = startTime;
        }

        if (endTime.HasValue)
        {
            entity.EndTime = endTime;
        }

        entity.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<Event?> StartAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Events.FirstOrDefaultAsync(evt => evt.Id == id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        if (entity.Status == EventStatus.Live)
        {
            return entity;
        }

        entity.Status = EventStatus.Live;
        entity.StartTime ??= DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<Event?> StopAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Events.FirstOrDefaultAsync(evt => evt.Id == id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        if (entity.Status == EventStatus.Completed)
        {
            return entity;
        }

        entity.Status = EventStatus.Completed;
        entity.EndTime = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Events.FirstOrDefaultAsync(evt => evt.Id == id, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        _dbContext.Events.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
