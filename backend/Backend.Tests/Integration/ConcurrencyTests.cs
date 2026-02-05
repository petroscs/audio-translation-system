using System.Net.Http.Json;
using Backend.Api.Contracts.Auth;
using Backend.Api.Contracts.Sessions;
using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Tests.Helpers;
using FluentAssertions;
using Xunit;

namespace Backend.Tests.Integration;

public class ConcurrencyTests : IClassFixture<TestServerFactory>, IDisposable
{
    private readonly TestServerFactory _factory;
    private readonly HttpClient _client;
    private readonly AppDbContext _dbContext;

    public ConcurrencyTests(TestServerFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        
        var scope = factory.Services.CreateScope();
        _dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    [Fact]
    public async Task CreateMultipleSessions_Concurrently_Succeeds()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser("testuser", "test@example.com", UserRole.Translator, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var evt = TestDataBuilder.CreateEvent("Test Event", "Description", user.Id);
        _dbContext.Events.Add(evt);
        await _dbContext.SaveChangesAsync();

        var channel = TestDataBuilder.CreateChannel(evt.Id);
        _dbContext.Channels.Add(channel);
        await _dbContext.SaveChangesAsync();

        var loginRequest = new LoginRequest { UsernameOrEmail = "testuser", Password = "password123" };
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokens!.AccessToken);

        var sessionRequest = new CreateSessionRequest
        {
            EventId = evt.Id,
            ChannelId = channel.Id,
            Role = SessionRole.Translator
        };

        // Act - Create 10 sessions concurrently
        var tasks = Enumerable.Range(0, 10)
            .Select(_ => _client.PostAsJsonAsync("/api/sessions", sessionRequest))
            .ToArray();

        var responses = await Task.WhenAll(tasks);

        // Assert
        responses.Should().AllSatisfy(r => r.IsSuccessStatusCode.Should().BeTrue());
        var sessions = await _dbContext.Sessions.Where(s => s.UserId == user.Id).ToListAsync();
        sessions.Should().HaveCount(10);
    }

    [Fact]
    public async Task GetEvents_Concurrently_ReturnsConsistentResults()
    {
        // Arrange
        var user = TestDataBuilder.CreateUser("testuser", "test@example.com", UserRole.Listener, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        // Create multiple events
        for (int i = 0; i < 5; i++)
        {
            var evt = TestDataBuilder.CreateEvent($"Event {i}", "Description", user.Id);
            _dbContext.Events.Add(evt);
        }
        await _dbContext.SaveChangesAsync();

        var loginRequest = new LoginRequest { UsernameOrEmail = "testuser", Password = "password123" };
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokens!.AccessToken);

        // Act - Get events 20 times concurrently
        var tasks = Enumerable.Range(0, 20)
            .Select(_ => _client.GetAsync("/api/events"))
            .ToArray();

        var responses = await Task.WhenAll(tasks);

        // Assert
        responses.Should().AllSatisfy(r => r.IsSuccessStatusCode.Should().BeTrue());
        var eventCounts = await Task.WhenAll(responses.Select(r => r.Content.ReadFromJsonAsync<List<Backend.Api.Contracts.Events.EventResponse>>(TestJsonOptions.Options)));
        eventCounts.Should().AllSatisfy(events => events!.Should().HaveCount(5));
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _client.Dispose();
    }
}
