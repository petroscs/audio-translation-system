using Backend.Models.Entities;
using Backend.Models.Enums;

namespace Backend.Services.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken);
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<User?> CreateAsync(string username, string email, UserRole role, string password, CancellationToken cancellationToken);
    Task<User?> UpdateAsync(
        Guid id,
        string? username,
        string? email,
        UserRole? role,
        string? password,
        bool allowRoleChange,
        CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
