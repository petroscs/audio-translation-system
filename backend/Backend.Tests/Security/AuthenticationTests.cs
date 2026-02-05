using System.Net;
using System.Net.Http.Json;
using System.Text;
using Backend.Api.Contracts.Auth;
using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Xunit;

namespace Backend.Tests.Security;

public class AuthenticationTests : IClassFixture<TestServerFactory>, IDisposable
{
    private readonly TestServerFactory _factory;
    private readonly HttpClient _client;
    private readonly AppDbContext _dbContext;

    public AuthenticationTests(TestServerFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        
        var scope = factory.Services.CreateScope();
        _dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsValidJwtToken()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser("testuser", "test@example.com", UserRole.Listener, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var request = new LoginRequest
        {
            UsernameOrEmail = "testuser",
            Password = "password123"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var tokenResponse = await response.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);
        tokenResponse.Should().NotBeNull();
        
        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.ReadJwtToken(tokenResponse!.AccessToken);
        token.Should().NotBeNull();
        token.Claims.Should().Contain(c => c.Type == ClaimTypes.NameIdentifier);
    }

    [Fact]
    public async Task Login_WithInvalidPassword_ReturnsUnauthorized()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser("testuser", "test@example.com", UserRole.Listener, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var request = new LoginRequest
        {
            UsernameOrEmail = "testuser",
            Password = "wrongpassword"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_WithNonexistentUser_ReturnsUnauthorized()
    {
        // Arrange
        var request = new LoginRequest
        {
            UsernameOrEmail = "nonexistent",
            Password = "password123"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_WithValidToken_ReturnsNewToken()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser("testuser", "test@example.com", UserRole.Listener, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var loginRequest = new LoginRequest { UsernameOrEmail = "testuser", Password = "password123" };
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);

        var refreshRequest = new RefreshRequest { RefreshToken = tokens!.RefreshToken };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/refresh", refreshRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var newTokens = await response.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);
        newTokens.Should().NotBeNull();
        newTokens!.AccessToken.Should().NotBeNullOrEmpty();
        newTokens.AccessToken.Should().NotBe(tokens.AccessToken); // Should be different token
    }

    [Fact]
    public async Task Refresh_WithExpiredToken_ReturnsUnauthorized()
    {
        // Arrange
        var refreshRequest = new RefreshRequest { RefreshToken = "expired-token" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/refresh", refreshRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_WithInvalidToken_ReturnsUnauthorized()
    {
        // Arrange
        var refreshRequest = new RefreshRequest { RefreshToken = "invalid-token" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/refresh", refreshRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AccessProtectedEndpoint_WithoutToken_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AccessProtectedEndpoint_WithExpiredToken_ReturnsUnauthorized()
    {
        // Arrange
        var expiredToken = GenerateExpiredToken();
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", expiredToken);

        // Act
        var response = await _client.GetAsync("/api/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AccessProtectedEndpoint_WithTamperedToken_ReturnsUnauthorized()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser("testuser", "test@example.com", UserRole.Listener, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var loginRequest = new LoginRequest { UsernameOrEmail = "testuser", Password = "password123" };
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);

        var tamperedToken = tokens!.AccessToken + "tampered";
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tamperedToken);

        // Act
        var response = await _client.GetAsync("/api/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AccessProtectedEndpoint_WithValidToken_Succeeds()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser("testuser", "test@example.com", UserRole.Listener, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var loginRequest = new LoginRequest { UsernameOrEmail = "testuser", Password = "password123" };
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);

        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokens!.AccessToken);

        // Act
        var response = await _client.GetAsync($"/api/users/{user.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private string GenerateExpiredToken()
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("test-secret-key-that-is-long-enough-for-hmacsha256"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: "test-issuer",
            audience: "test-audience",
            claims: new[] { new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) },
            expires: DateTime.UtcNow.AddMinutes(-1), // Expired
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _client.Dispose();
    }
}
