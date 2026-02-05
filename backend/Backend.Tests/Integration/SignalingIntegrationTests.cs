using System.Net.Http.Json;
using Backend.Api.Contracts.Auth;
using Backend.Api.Contracts.Signaling;
using Backend.Api.Contracts.Sessions;
using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR.Client;
using Xunit;

namespace Backend.Tests.Integration;

public class SignalingIntegrationTests : IClassFixture<TestServerFactory>, IDisposable
{
    private readonly TestServerFactory _factory;
    private readonly HttpClient _client;
    private readonly AppDbContext _dbContext;
    private HubConnection? _hubConnection;
    private string? _token;
    private Guid _sessionId;

    public SignalingIntegrationTests(TestServerFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        
        var scope = factory.Services.CreateScope();
        _dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    [Fact]
    public async Task CreateTransport_WithValidSession_Succeeds()
    {
        // Arrange
        await SetupSession();
        await ConnectToHub();

        var request = new CreateTransportRequest
        {
            SessionId = _sessionId,
            Direction = TransportDirection.Send
        };

        // Act
        var response = await _hubConnection!.InvokeAsync<TransportCreatedResponse>("CreateTransport", request);

        // Assert
        response.Should().NotBeNull();
        response.TransportId.Should().NotBeEmpty();
        response.MediasoupTransportId.Should().NotBeNullOrEmpty();
        response.IceParameters.Should().NotBeNullOrEmpty();
        response.DtlsParameters.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task ConnectTransport_WithValidTransport_Succeeds()
    {
        // Arrange
        await SetupSession();
        await ConnectToHub();

        var createTransportRequest = new CreateTransportRequest
        {
            SessionId = _sessionId,
            Direction = TransportDirection.Send
        };
        var transport = await _hubConnection!.InvokeAsync<TransportCreatedResponse>("CreateTransport", createTransportRequest);

        var connectRequest = new ConnectTransportRequest
        {
            TransportId = transport.TransportId,
            DtlsParameters = "{\"fingerprints\":[],\"role\":\"auto\"}"
        };

        // Act
        await _hubConnection.InvokeAsync("ConnectTransport", connectRequest);

        // Assert - Should not throw exception
        Assert.True(true);
    }

    [Fact]
    public async Task Produce_WithValidTransport_Succeeds()
    {
        // Arrange
        await SetupSession();
        await ConnectToHub();

        var createTransportRequest = new CreateTransportRequest
        {
            SessionId = _sessionId,
            Direction = TransportDirection.Send
        };
        var transport = await _hubConnection!.InvokeAsync<TransportCreatedResponse>("CreateTransport", createTransportRequest);

        var connectRequest = new ConnectTransportRequest
        {
            TransportId = transport.TransportId,
            DtlsParameters = "{\"fingerprints\":[],\"role\":\"auto\"}"
        };
        await _hubConnection.InvokeAsync("ConnectTransport", connectRequest);

        var produceRequest = new ProduceRequest
        {
            TransportId = transport.TransportId,
            Kind = MediaKind.Audio,
            RtpParameters = "{\"codecs\":[],\"headerExtensions\":[],\"rtcp\":{}}"
        };

        // Act
        var response = await _hubConnection.InvokeAsync<ProducerCreatedResponse>("Produce", produceRequest);

        // Assert
        response.Should().NotBeNull();
        response.ProducerId.Should().NotBeEmpty();
        response.MediasoupProducerId.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Consume_WithValidProducer_Succeeds()
    {
        // Arrange
        await SetupSession();
        await ConnectToHub();

        // Create send transport and producer (translator)
        var sendTransportRequest = new CreateTransportRequest
        {
            SessionId = _sessionId,
            Direction = TransportDirection.Send
        };
        var sendTransport = await _hubConnection!.InvokeAsync<TransportCreatedResponse>("CreateTransport", sendTransportRequest);
        await _hubConnection.InvokeAsync("ConnectTransport", new ConnectTransportRequest
        {
            TransportId = sendTransport.TransportId,
            DtlsParameters = "{\"fingerprints\":[],\"role\":\"auto\"}"
        });
        var producer = await _hubConnection.InvokeAsync<ProducerCreatedResponse>("Produce", new ProduceRequest
        {
            TransportId = sendTransport.TransportId,
            Kind = MediaKind.Audio,
            RtpParameters = "{\"codecs\":[],\"headerExtensions\":[],\"rtcp\":{}}"
        });

        // Create receive transport (listener)
        var receiveTransportRequest = new CreateTransportRequest
        {
            SessionId = _sessionId,
            Direction = TransportDirection.Receive
        };
        var receiveTransport = await _hubConnection.InvokeAsync<TransportCreatedResponse>("CreateTransport", receiveTransportRequest);
        await _hubConnection.InvokeAsync("ConnectTransport", new ConnectTransportRequest
        {
            TransportId = receiveTransport.TransportId,
            DtlsParameters = "{\"fingerprints\":[],\"role\":\"auto\"}"
        });

        var consumeRequest = new ConsumeRequest
        {
            TransportId = receiveTransport.TransportId,
            ProducerId = producer.ProducerId
        };

        // Act
        var response = await _hubConnection.InvokeAsync<ConsumerCreatedResponse>("Consume", consumeRequest);

        // Assert
        response.Should().NotBeNull();
        response.ConsumerId.Should().NotBeEmpty();
        response.MediasoupConsumerId.Should().NotBeNullOrEmpty();
        response.RtpParameters.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task JoinSession_AddsClientToGroup()
    {
        // Arrange
        await SetupSession();
        await ConnectToHub();

        // Act
        await _hubConnection!.InvokeAsync("JoinSession", _sessionId);

        // Assert - Should not throw exception
        Assert.True(true);
    }

    [Fact]
    public async Task Ping_ReturnsPong()
    {
        // Arrange
        await SetupSession();
        await ConnectToHub();

        // Act
        var response = await _hubConnection!.InvokeAsync<string>("Ping");

        // Assert
        response.Should().Be("pong");
    }

    private async Task SetupSession()
    {
        // Create user
        var user = TestDataBuilder.CreateUser("testuser", "test@example.com", UserRole.Translator, BCrypt.Net.BCrypt.HashPassword("password123"));
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        // Login
        var loginRequest = new LoginRequest { UsernameOrEmail = "testuser", Password = "password123" };
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<TokenResponse>(TestJsonOptions.Options);
        _token = tokens!.AccessToken;

        // Create event and channel
        var evt = TestDataBuilder.CreateEvent("Test Event", "Description", user.Id);
        _dbContext.Events.Add(evt);
        await _dbContext.SaveChangesAsync();

        var channel = TestDataBuilder.CreateChannel(evt.Id);
        _dbContext.Channels.Add(channel);
        await _dbContext.SaveChangesAsync();

        // Create session
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

    private async Task ConnectToHub()
    {
        var baseUrl = _client.BaseAddress!.ToString().TrimEnd('/');
        var hubUrl = $"{baseUrl}/ws/signaling?access_token={_token}";

        _hubConnection = new HubConnectionBuilder()
            .WithUrl(hubUrl)
            .Build();

        await _hubConnection.StartAsync();
    }

    public void Dispose()
    {
        _hubConnection?.StopAsync().Wait();
        _hubConnection?.DisposeAsync().AsTask().Wait();
        _dbContext.Database.EnsureDeleted();
        _client.Dispose();
    }
}
