using System.Net;
using System.Net.Http.Json;
using Backend.Api.Contracts.Auth;
using Backend.Api.Contracts.Events;
using Backend.Api.Contracts.Users;
using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Tests.Helpers;
using FluentAssertions;
using Xunit;

namespace Backend.Tests.Security;

public class AuthorizationTests : IClassFixture<TestServerFactory>, IDisposable
{
    private readonly TestServerFactory _factory;
    private readonly HttpClient _client;
    private readonly AppDbContext _dbContext;
    private string? _adminToken;
    private string? _translatorToken;
    private string? _listenerToken;

    public AuthorizationTests(TestServerFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        
        var scope = factory.Services.CreateScope();
        _dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    [Fact]
    public async Task GetUsers_AsAdmin_Succeeds()
    {
        // Arrange
        await SetupAdminUser();
        await SetAuthHeader(_adminToken!);

        // Act
        var response = await _client.GetAsync("/api/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetUsers_AsTranslator_ReturnsForbidden()
    {
        // Arrange
        await SetupTranslatorUser();
        await SetAuthHeader(_translatorToken!);

        // Act
        var response = await _client.GetAsync("/api/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetUsers_AsListener_ReturnsForbidden()
    {
        // Arrange
        await SetupListenerUser();
        await SetAuthHeader(_listenerToken!);

        // Act
        var response = await _client.GetAsync("/api/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateUser_AsAdmin_Succeeds()
    {
        // Arrange
        await SetupAdminUser();
        await SetAuthHeader(_adminToken!);

        var request = new CreateUserRequest
        {
            Username = "newuser",
            Email = "newuser@example.com",
            Role = UserRole.Listener,
            Password = "password123"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateUser_AsTranslator_ReturnsForbidden()
    {
        // Arrange
        await SetupTranslatorUser();
        await SetAuthHeader(_translatorToken!);

        var request = new CreateUserRequest
        {
            Username = "newuser",
            Email = "newuser@example.com",
            Role = UserRole.Listener,
            Password = "password123"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateEvent_AsAdmin_Succeeds()
    {
        // Arrange
        await SetupAdminUser();
        await SetAuthHeader(_adminToken!);

        var request = new CreateEventRequest
        {
            Name = "Test Event",
            Description = "Test Description",
            StartTime = DateTime.UtcNow.AddHours(1),
            EndTime = DateTime.UtcNow.AddHours(3)
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/events", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateEvent_AsTranslator_Succeeds()
    {
        // Arrange
        await SetupTranslatorUser();
        await SetAuthHeader(_translatorToken!);

        var request = new CreateEventRequest
        {
            Name = "Test Event",
            Description = "Test Description",
            StartTime = DateTime.UtcNow.AddHours(1),
            EndTime = DateTime.UtcNow.AddHours(3)
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/events", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateEvent_AsListener_ReturnsForbidden()
    {
        // Arrange
        await SetupListenerUser();
        await SetAuthHeader(_listenerToken!);

        var request = new CreateEventRequest
        {
            Name = "Test Event",
            Description = "Test Description",
            StartTime = DateTime.UtcNow.AddHours(1),
            EndTime = DateTime.UtcNow.AddHours(3)
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/events", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetUser_AsSelf_Succeeds()
    {
        // Arrange
        await SetupListenerUser();
        await SetAuthHeader(_listenerToken!);

        var userId = _dbContext.Users.First(u => u.Username == "listener").Id;

        // Act
        var response = await _client.GetAsync($"/api/users/{userId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetUser_AsOtherUser_ReturnsForbidden()
    {
        // Arrange
        await SetupListenerUser();
        await SetAuthHeader(_listenerToken!);

        var otherUser = TestDataBuilder.CreateUser("otheruser", "other@example.com", UserRole.Listener, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.Add(otherUser);
        await _dbContext.SaveChangesAsync();

        // Act
        var response = await _client.GetAsync($"/api/users/{otherUser.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetUser_AsAdmin_Succeeds()
    {
        // Arrange
        await SetupAdminUser();
        await SetAuthHeader(_adminToken!);

        var otherUser = TestDataBuilder.CreateUser("otheruser", "other@example.com", UserRole.Listener, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.Add(otherUser);
        await _dbContext.SaveChangesAsync();

        // Act
        var response = await _client.GetAsync($"/api/users/{otherUser.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
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

    private async Task SetupTranslatorUser()
    {
        var translator = _dbContext.Users.FirstOrDefault(u => u.Username == "translator");
        if (translator == null)
        {
            translator = TestDataBuilder.CreateUser("translator", "translator@example.com", UserRole.Translator, BCrypt.Net.BCrypt.HashPassword("password123"));
            _dbContext.Users.Add(translator);
            await _dbContext.SaveChangesAsync();
        }

        var loginRequest = new LoginRequest { UsernameOrEmail = "translator", Password = "password123" };
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);
        _translatorToken = tokens!.AccessToken;
    }

    private async Task SetupListenerUser()
    {
        var listener = _dbContext.Users.FirstOrDefault(u => u.Username == "listener");
        if (listener == null)
        {
            listener = TestDataBuilder.CreateUser("listener", "listener@example.com", UserRole.Listener, BCrypt.Net.BCrypt.HashPassword("password123"));
            _dbContext.Users.Add(listener);
            await _dbContext.SaveChangesAsync();
        }

        var loginRequest = new LoginRequest { UsernameOrEmail = "listener", Password = "password123" };
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);
        _listenerToken = tokens!.AccessToken;
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
