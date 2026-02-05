using System.Net;
using System.Net.Http.Json;
using Backend.Api.Contracts.Auth;
using Backend.Api.Contracts.Users;
using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Tests.Helpers;
using FluentAssertions;
using Xunit;

namespace Backend.Tests.Security;

public class DataSecurityTests : IClassFixture<TestServerFactory>, IDisposable
{
    private readonly TestServerFactory _factory;
    private readonly HttpClient _client;
    private readonly AppDbContext _dbContext;
    private string? _adminToken;

    public DataSecurityTests(TestServerFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        
        var scope = factory.Services.CreateScope();
        _dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    [Fact]
    public async Task CreateUser_PasswordIsHashed_NotStoredInPlainText()
    {
        // Arrange
        await SetupAdminUser();
        await SetAuthHeader(_adminToken!);

        var request = new CreateUserRequest
        {
            Username = "testuser",
            Email = "test@example.com",
            Role = UserRole.Listener,
            Password = "password123"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);
        response.EnsureSuccessStatusCode();
        var user = await response.Content.ReadFromJsonAsync<UserResponse>(TestJsonOptions.Options);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var dbUser = await _dbContext.Users.FindAsync(user!.Id);
        dbUser.Should().NotBeNull();
        dbUser!.PasswordHash.Should().NotBe("password123");
        dbUser.PasswordHash.Should().NotBeNullOrEmpty();
        BCrypt.Net.BCrypt.Verify("password123", dbUser.PasswordHash).Should().BeTrue();
    }

  [Fact]
  public async Task GetUser_DoesNotReturnPasswordHash()
  {
    // Arrange
    await SetupAdminUser();
    await SetAuthHeader(_adminToken!);

    var user = TestDataBuilder.CreateUser("testuser", "test@example.com", UserRole.Listener, BCrypt.Net.BCrypt.HashPassword("password123"));
    _dbContext.Users.Add(user);
    await _dbContext.SaveChangesAsync();

    // Act
    var response = await _client.GetAsync($"/api/users/{user.Id}");

    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var json = await response.Content.ReadAsStringAsync();
    json.ToLowerInvariant().Should().NotContain("passwordhash");
    json.ToLowerInvariant().Should().NotContain("password");
  }

    [Fact]
    public async Task ErrorResponse_DoesNotExposeInternalDetails()
    {
        // Arrange
        await SetupAdminUser();
        await SetAuthHeader(_adminToken!);

        // Act - Try to get non-existent user
        var response = await _client.GetAsync($"/api/users/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var content = await response.Content.ReadAsStringAsync();
        // Should not expose stack traces or internal error details
        content.ToLowerInvariant().Should().NotContain("at ");
        content.ToLowerInvariant().Should().NotContain("stacktrace");
        content.ToLowerInvariant().Should().NotContain("exception");
    }

    [Fact]
    public async Task Login_WithSQLInjectionAttempt_Rejected()
    {
        // Arrange
        var request = new LoginRequest
        {
            UsernameOrEmail = "admin' OR '1'='1",
            Password = "password123"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", request);

        // Assert
        // Should either return unauthorized or handle gracefully without SQL error
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.BadRequest);
        var content = await response.Content.ReadAsStringAsync();
        content.ToLowerInvariant().Should().NotContain("sql");
        content.ToLowerInvariant().Should().NotContain("syntax error");
    }

    [Fact]
    public async Task CreateUser_WithXSSAttempt_Sanitized()
    {
        // Arrange
        await SetupAdminUser();
        await SetAuthHeader(_adminToken!);

        var unique = Guid.NewGuid().ToString("N")[..8];
        var request = new CreateUserRequest
        {
            Username = "<script>alert('xss')</script>",
            Email = $"xss-{unique}@example.com",
            Role = UserRole.Listener,
            Password = "password123"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);

        // Assert
        // Should either reject or sanitize
        if (response.IsSuccessStatusCode)
        {
            var user = await response.Content.ReadFromJsonAsync<UserResponse>(TestJsonOptions.Options);
            user!.Username.Should().NotContain("<script>");
            user.Username.Should().NotContain("alert");
        }
        else
        {
            // API may return 400 (validation) or 409 (duplicate username/email)
            response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.Conflict);
        }
    }

    private async Task SetupAdminUser()
    {
        var admin = _dbContext.Users.FirstOrDefault(u => u.Username == "admin");
        if (admin == null)
        {
            admin = TestDataBuilder.CreateUser("admin", "admin@example.com", UserRole.Admin, BCrypt.Net.BCrypt.HashPassword("admin123"));
            _dbContext.Users.Add(admin);
            await _dbContext.SaveChangesAsync();
        }

        var loginRequest = new LoginRequest { UsernameOrEmail = "admin", Password = "admin123" };
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);
        _adminToken = tokens!.AccessToken;
    }

    private async Task SetAuthHeader(string token)
    {
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _client.Dispose();
    }
}
