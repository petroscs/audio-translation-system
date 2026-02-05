using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Services;

public sealed class UserService : IUserService
{
    private readonly AppDbContext _dbContext;

    public UserService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .AsNoTracking()
            .OrderBy(user => user.Username)
            .ToListAsync(cancellationToken);
    }

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == id, cancellationToken);
    }

    public async Task<User?> CreateAsync(string username, string email, UserRole role, string password, CancellationToken cancellationToken)
    {
        var normalizedUsername = username.Trim();
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var exists = await _dbContext.Users.AnyAsync(
            user => user.Username == normalizedUsername || user.Email == normalizedEmail,
            cancellationToken);

        if (exists)
        {
            return null;
        }

        var userEntity = new User
        {
            Id = Guid.NewGuid(),
            Username = normalizedUsername,
            Email = normalizedEmail,
            Role = role,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(userEntity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return userEntity;
    }

    public async Task<User?> UpdateAsync(
        Guid id,
        string? username,
        string? email,
        UserRole? role,
        string? password,
        bool allowRoleChange,
        CancellationToken cancellationToken)
    {
        var userEntity = await _dbContext.Users.FirstOrDefaultAsync(user => user.Id == id, cancellationToken);
        if (userEntity is null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(username))
        {
            var normalizedUsername = username.Trim();
            var exists = await _dbContext.Users.AnyAsync(
                user => user.Username == normalizedUsername && user.Id != id,
                cancellationToken);
            if (exists)
            {
                return null;
            }

            userEntity.Username = normalizedUsername;
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();
            var exists = await _dbContext.Users.AnyAsync(
                user => user.Email == normalizedEmail && user.Id != id,
                cancellationToken);
            if (exists)
            {
                return null;
            }

            userEntity.Email = normalizedEmail;
        }

        if (allowRoleChange && role.HasValue)
        {
            userEntity.Role = role.Value;
        }

        if (!string.IsNullOrWhiteSpace(password))
        {
            userEntity.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
        }

        userEntity.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return userEntity;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var userEntity = await _dbContext.Users.FirstOrDefaultAsync(user => user.Id == id, cancellationToken);
        if (userEntity is null)
        {
            return false;
        }

        _dbContext.Users.Remove(userEntity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
