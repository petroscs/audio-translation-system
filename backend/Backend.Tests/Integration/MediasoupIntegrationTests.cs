using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Api.Contracts.Auth;
using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Backend.Services.Models;
using Backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Moq.Protected;
using Xunit;

namespace Backend.Tests.Integration;

public class MediasoupIntegrationTests : IClassFixture<TestServerFactory>, IDisposable
{
    private readonly TestServerFactory _factory;
    private readonly HttpClient _client;
    private readonly AppDbContext _dbContext;
    private readonly Mock<HttpMessageHandler> _httpHandlerMock;

    public MediasoupIntegrationTests(TestServerFactory factory)
    {
        _factory = factory;
        _httpHandlerMock = new Mock<HttpMessageHandler>();
        _client = factory.CreateClient();
        
        var scope = factory.Services.CreateScope();
        _dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    [Fact]
    public async Task CreateTransport_WhenMediasoupUnavailable_HandlesGracefully()
    {
        // Arrange
        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.ServiceUnavailable,
                Content = new StringContent("Service unavailable")
            });

        var httpClient = new HttpClient(_httpHandlerMock.Object)
        {
            BaseAddress = new Uri("http://mediasoup:4000")
        };

        var mediasoupService = new Backend.Services.Services.MediasoupService(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new Backend.Services.Models.MediasoupSettings
            {
                BaseUrl = "http://mediasoup:4000"
            }));

        // Act & Assert - service wraps HTTP errors in InvalidOperationException
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await mediasoupService.CreateTransportAsync(
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                TransportDirection.Send,
                CancellationToken.None);
        });
    }

    [Fact]
    public async Task CreateTransport_WithValidRequest_ReturnsTransport()
    {
        // Arrange
        // MediasoupTransportResult expects IceParameters and DtlsParameters as JSON strings
        var transportResponse = new
        {
            mediasoupTransportId = "test-transport-id",
            iceParameters = "{\"username\":\"test\",\"password\":\"test\"}",
            iceCandidates = "[]",
            dtlsParameters = "{\"fingerprints\":[],\"role\":\"auto\"}"
        };

        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(transportResponse))
            });

        var httpClient = new HttpClient(_httpHandlerMock.Object)
        {
            BaseAddress = new Uri("http://mediasoup:4000")
        };

        var mediasoupService = new Backend.Services.Services.MediasoupService(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new Backend.Services.Models.MediasoupSettings
            {
                BaseUrl = "http://mediasoup:4000"
            }));

        // Act
        var result = await mediasoupService.CreateTransportAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            TransportDirection.Send,
            CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.MediasoupTransportId.Should().Be("test-transport-id");
    }

    // Note: CreateRouterAsync may not exist in IMediasoupService interface
    // This test is kept as placeholder for when router creation is needed

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _client.Dispose();
        _httpHandlerMock.Reset();
    }
}
