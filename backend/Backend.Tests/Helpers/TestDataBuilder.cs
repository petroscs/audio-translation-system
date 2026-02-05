using Backend.Models.Entities;
using Backend.Models.Enums;

namespace Backend.Tests.Helpers;

public class TestDataBuilder
{
    public static User CreateUser(
        string username = "testuser",
        string email = "test@example.com",
        UserRole role = UserRole.Listener,
        string passwordHash = "hashed_password")
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            Email = email,
            Role = role,
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static Event CreateEvent(
        string name = "Test Event",
        string description = "Test Description",
        Guid? createdBy = null)
    {
        return new Event
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description,
            StartTime = DateTime.UtcNow.AddHours(1),
            EndTime = DateTime.UtcNow.AddHours(3),
            Status = EventStatus.Scheduled,
            CreatedByUserId = createdBy ?? Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static Channel CreateChannel(
        Guid eventId,
        string name = "Test Channel",
        string languageCode = "en")
    {
        return new Channel
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Name = name,
            LanguageCode = languageCode,
            CreatedAt = DateTime.UtcNow
        };
    }

    public static Session CreateSession(
        Guid userId,
        Guid eventId,
        Guid channelId,
        SessionRole role = SessionRole.Translator,
        SessionStatus status = SessionStatus.Active)
    {
        return new Session
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventId = eventId,
            ChannelId = channelId,
            Role = role,
            Status = status,
            StartedAt = DateTime.UtcNow
        };
    }
}
