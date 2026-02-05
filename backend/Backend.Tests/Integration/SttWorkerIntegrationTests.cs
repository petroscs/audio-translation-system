using System.Net;
using System.Net.Http.Json;
using Backend.Api.Contracts.Auth;
using Backend.Infrastructure.Data;
using Backend.Models.Entities;
using Backend.Models.Enums;
using Backend.Tests.Helpers;
using FluentAssertions;
using Moq;
using Moq.Protected;
using Xunit;

namespace Backend.Tests.Integration;

public class SttWorkerIntegrationTests : IClassFixture<TestServerFactory>, IDisposable
{
    private readonly TestServerFactory _factory;
    private readonly HttpClient _client;
    private readonly AppDbContext _dbContext;
    private readonly Mock<HttpMessageHandler> _httpHandlerMock;

    public SttWorkerIntegrationTests(TestServerFactory factory)
    {
        _factory = factory;
        _httpHandlerMock = new Mock<HttpMessageHandler>();
        _client = factory.CreateClient();
        
        var scope = factory.Services.CreateScope();
        _dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    [Fact]
    public async Task StartSttWorker_WhenCalled_SendsStartRequest()
    {
        // Arrange
        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => 
                    req.RequestUri!.ToString().Contains("stt/start") && 
                    req.Method == HttpMethod.Post),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.Accepted
            });

        var httpClient = new HttpClient(_httpHandlerMock.Object)
        {
            BaseAddress = new Uri("http://stt-worker:5002")
        };

        var sttWorkerService = new Backend.Services.Services.SttWorkerService(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new Backend.Services.Models.SttWorkerSettings
            {
                BaseUrl = "http://stt-worker:5002"
            }));

        // Act
        await sttWorkerService.StartAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "test-producer-id",
            CancellationToken.None);

        // Assert
        _httpHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.ToString().Contains("stt/start")),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task StopSttWorker_WhenCalled_SendsStopRequest()
    {
        // Arrange
        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => 
                    req.RequestUri!.ToString().Contains("stt/stop") && 
                    req.Method == HttpMethod.Post),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK
            });

        var httpClient = new HttpClient(_httpHandlerMock.Object)
        {
            BaseAddress = new Uri("http://stt-worker:5002")
        };

        var sttWorkerService = new Backend.Services.Services.SttWorkerService(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new Backend.Services.Models.SttWorkerSettings
            {
                BaseUrl = "http://stt-worker:5002"
            }));

        // Act
        await sttWorkerService.StopAsync(
            Guid.NewGuid(),
            CancellationToken.None);

        // Assert
        _httpHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.ToString().Contains("stt/stop")),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task StartSttWorker_WhenUnavailable_HandlesGracefully()
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
            BaseAddress = new Uri("http://stt-worker:5002")
        };

        var sttWorkerService = new Backend.Services.Services.SttWorkerService(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new Backend.Services.Models.SttWorkerSettings
            {
                BaseUrl = "http://stt-worker:5002"
            }));

        // Act & Assert - service wraps HTTP errors in InvalidOperationException
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await sttWorkerService.StartAsync(
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                "test-producer-id",
                CancellationToken.None);
        });
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _client.Dispose();
        _httpHandlerMock.Reset();
    }
}
