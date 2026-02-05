using System.Net;
using System.Net.Http.Json;
using Backend.Api.Contracts.Auth;
using Backend.Api.Contracts.Sessions;
using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Tests.Helpers;
using FluentAssertions;
using Xunit;

namespace Backend.Tests.Security;

public class SessionSecurityTests : IClassFixture<TestServerFactory>, IDisposable
{
    private readonly TestServerFactory _factory;
    private readonly HttpClient _client;
    private readonly AppDbContext _dbContext;
    private string? _user1Token;
    private string? _user2Token;
    private Guid _sessionId;

    public SessionSecurityTests(TestServerFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        
        var scope = factory.Services.CreateScope();
        _dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    [Fact]
    public async Task GetSession_AsOwner_Succeeds()
    {
        // Arrange
        await SetupSession();
        await SetAuthHeader(_user1Token!);

        // Act
        var response = await _client.GetAsync($"/api/sessions/{_sessionId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetSession_AsOtherUser_ReturnsForbidden()
    {
        // Arrange
        await SetupSession();
        await SetAuthHeader(_user2Token!);

        // Act
        var response = await _client.GetAsync($"/api/sessions/{_sessionId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task EndSession_AsOwner_Succeeds()
    {
        // Arrange
        await SetupSession();
        await SetAuthHeader(_user1Token!);

        // Act
        var response = await _client.PutAsync($"/api/sessions/{_sessionId}/end", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task EndSession_AsOtherUser_ReturnsForbidden()
    {
        // Arrange
        await SetupSession();
        await SetAuthHeader(_user2Token!);

        // Act
        var response = await _client.PutAsync($"/api/sessions/{_sessionId}/end", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task MultipleSessions_FromSameUser_Allowed()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser("testuser", "test@example.com", UserRole.Translator, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var evt = TestDataBuilder.CreateEvent("Test Event", "Description", user.Id);
        _dbContext.Events.Add(evt);
        await _dbContext.SaveChangesAsync();

        var channel1 = TestDataBuilder.CreateChannel(evt.Id, "Channel 1");
        var channel2 = TestDataBuilder.CreateChannel(evt.Id, "Channel 2");
        _dbContext.Channels.AddRange(channel1, channel2);
        await _dbContext.SaveChangesAsync();

        var loginRequest = new LoginRequest { UsernameOrEmail = "testuser", Password = "password123" };
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);
        await SetAuthHeader(tokens!.AccessToken);

        var sessionRequest1 = new CreateSessionRequest
        {
            EventId = evt.Id,
            ChannelId = channel1.Id,
            Role = SessionRole.Translator
        };

        var sessionRequest2 = new CreateSessionRequest
        {
            EventId = evt.Id,
            ChannelId = channel2.Id,
            Role = SessionRole.Translator
        };

        // Act
        var response1 = await _client.PostAsJsonAsync("/api/sessions", sessionRequest1);
        var response2 = await _client.PostAsJsonAsync("/api/sessions", sessionRequest2);

        // Assert
        response1.StatusCode.Should().Be(HttpStatusCode.Created);
        response2.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    private async Task SetupSession()
    {
        var user1 = TestDataBuilder.CreateUser("user1", "user1@example.com", UserRole.Translator, BCrypt.Net.BCrypt.HashPassword("password123"));
        var user2 = TestDataBuilder.CreateUser("user2", "user2@example.com", UserRole.Listener, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.AddRange(user1, user2);
        await _dbContext.SaveChangesAsync();

        var evt = TestDataBuilder.CreateEvent("Test Event", "Description", user1.Id);
        _dbContext.Events.Add(evt);
        await _dbContext.SaveChangesAsync();

        var channel = TestDataBuilder.CreateChannel(evt.Id);
        _dbContext.Channels.Add(channel);
        await _dbContext.SaveChangesAsync();

        var loginRequest1 = new LoginRequest { UsernameOrEmail = "user1", Password = "password123" };
        var loginResponse1 = await _client.PostAsJsonAsync("/api/auth/login", loginRequest1);
        loginResponse1.EnsureSuccessStatusCode();
        var tokens1 = await loginResponse1.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);
        _user1Token = tokens1!.AccessToken;

        var loginRequest2 = new LoginRequest { UsernameOrEmail = "user2", Password = "password123" };
        var loginResponse2 = await _client.PostAsJsonAsync("/api/auth/login", loginRequest2);
        loginResponse2.EnsureSuccessStatusCode();
        var tokens2 = await loginResponse2.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);
        _user2Token = tokens2!.AccessToken;

        await SetAuthHeader(_user1Token);
        var sessionRequest = new CreateSessionRequest
        {
            EventId = evt.Id,
            ChannelId = channel.Id,
            Role = SessionRole.Translator
        };
        var sessionResponse = await _client.PostAsJsonAsync("/api/sessions", sessionRequest);
        sessionResponse.EnsureSuccessStatusCode();
        var session = await sessionResponse.Content.ReadFromJsonAsync<SessionResponse>(TestJsonOptions.Options);
        _sessionId = session!.Id;
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
