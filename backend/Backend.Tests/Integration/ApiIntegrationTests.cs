using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Api.Contracts.Auth;
using Backend.Api.Contracts.Channels;
using Backend.Api.Contracts.Events;
using Backend.Api.Contracts.Sessions;
using Backend.Api.Contracts.Users;
using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Backend.Tests.Integration;

public class ApiIntegrationTests : IClassFixture<TestServerFactory>, IDisposable
{
    private readonly TestServerFactory _factory;
    private readonly HttpClient _client;
    private readonly AppDbContext _dbContext;
    private string? _adminToken;
    private string? _translatorToken;
    private string? _listenerToken;

    public ApiIntegrationTests(TestServerFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        
        var scope = factory.Services.CreateScope();
        _dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsToken()
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
        tokenResponse!.AccessToken.Should().NotBeNullOrEmpty();
        tokenResponse.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ReturnsUnauthorized()
    {
        // Arrange
        var request = new LoginRequest
        {
            UsernameOrEmail = "nonexistent",
            Password = "wrongpassword"
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
        await SetupAdminUser();
        var loginRequest = new LoginRequest { UsernameOrEmail = "admin", Password = "admin123" };
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
    }

    [Fact]
    public async Task GetUsers_AsAdmin_ReturnsUsers()
    {
        // Arrange
        await SetupAdminUser();
        await SetAuthHeader(_adminToken!);

        // Act
        var response = await _client.GetAsync("/api/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var users = await response.Content.ReadFromJsonAsync<List<UserResponse>>(TestJsonOptions.Options);
        users.Should().NotBeNull();
    }

    [Fact]
    public async Task GetUsers_AsNonAdmin_ReturnsForbidden()
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
        var user = await response.Content.ReadFromJsonAsync<UserResponse>(TestJsonOptions.Options);
        user.Should().NotBeNull();
        user!.Username.Should().Be("newuser");
    }

    [Fact]
    public async Task GetEvents_AsAuthenticatedUser_ReturnsEvents()
    {
        // Arrange
        await SetupListenerUser();
        await SetAuthHeader(_listenerToken!);

        var evt = TestDataBuilder.CreateEvent();
        _dbContext.Events.Add(evt);
        await _dbContext.SaveChangesAsync();

        // Act
        var response = await _client.GetAsync("/api/events");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var events = await response.Content.ReadFromJsonAsync<List<EventResponse>>(TestJsonOptions.Options);
        events.Should().NotBeNull();
        events!.Should().HaveCountGreaterThan(0);
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
        var evt = await response.Content.ReadFromJsonAsync<EventResponse>(TestJsonOptions.Options);
        evt.Should().NotBeNull();
        evt!.Name.Should().Be("Test Event");
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
    public async Task GetChannels_ForExistingEvent_ReturnsChannels()
    {
        // Arrange
        await SetupListenerUser();
        await SetAuthHeader(_listenerToken!);

        var evt = TestDataBuilder.CreateEvent();
        _dbContext.Events.Add(evt);
        await _dbContext.SaveChangesAsync();

        var channel = TestDataBuilder.CreateChannel(evt.Id);
        _dbContext.Channels.Add(channel);
        await _dbContext.SaveChangesAsync();

        // Act
        var response = await _client.GetAsync($"/api/events/{evt.Id}/channels");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var channels = await response.Content.ReadFromJsonAsync<List<ChannelResponse>>(TestJsonOptions.Options);
        channels.Should().NotBeNull();
        channels!.Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public async Task CreateSession_AsTranslator_Succeeds()
    {
        // Arrange
        await SetupTranslatorUser();
        await SetAuthHeader(_translatorToken!);

        var evt = TestDataBuilder.CreateEvent();
        _dbContext.Events.Add(evt);
        await _dbContext.SaveChangesAsync();

        var channel = TestDataBuilder.CreateChannel(evt.Id);
        _dbContext.Channels.Add(channel);
        await _dbContext.SaveChangesAsync();

        var userId = _dbContext.Users.First(u => u.Username == "translator").Id;

        var request = new CreateSessionRequest
        {
            EventId = evt.Id,
            ChannelId = channel.Id,
            Role = SessionRole.Translator
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/sessions", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var session = await response.Content.ReadFromJsonAsync<SessionResponse>(TestJsonOptions.Options);
        session.Should().NotBeNull();
        session!.EventId.Should().Be(evt.Id);
        session.ChannelId.Should().Be(channel.Id);
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
