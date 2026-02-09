using System.Net;
using Backend.Infrastructure.Data;
using Backend.Tests.Helpers;
using FluentAssertions;
using Moq;
using Moq.Protected;
using Xunit;

namespace Backend.Tests.Integration;

public class RecordingWorkerIntegrationTests : IClassFixture<TestServerFactory>, IDisposable
{
    private readonly TestServerFactory _factory;
    private readonly HttpClient _client;
    private readonly AppDbContext _dbContext;
    private readonly Mock<HttpMessageHandler> _httpHandlerMock;

    public RecordingWorkerIntegrationTests(TestServerFactory factory)
    {
        _factory = factory;
        _httpHandlerMock = new Mock<HttpMessageHandler>();
        _client = factory.CreateClient();
        
        var scope = factory.Services.CreateScope();
        _dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    [Fact]
    public async Task StartRecording_WhenCalled_SendsStartRequest()
    {
        // Arrange
        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => 
                    req.RequestUri!.ToString().Contains("recording/start") && 
                    req.Method == HttpMethod.Post),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.Accepted
            });

        var httpClient = new HttpClient(_httpHandlerMock.Object)
        {
            BaseAddress = new Uri("http://recording-worker:5003")
        };

        var recordingWorkerService = new Backend.Services.Services.RecordingWorkerService(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new Backend.Services.Models.RecordingWorkerSettings
            {
                BaseUrl = "http://recording-worker:5003",
                ApiKey = "test-api-key"
            }));

        // Act
        await recordingWorkerService.StartAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "test-producer-id",
            CancellationToken.None);

        // Assert
        _httpHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.ToString().Contains("recording/start")),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task StopRecording_WhenCalled_SendsStopRequest()
    {
        // Arrange
        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => 
                    req.RequestUri!.ToString().Contains("recording/stop") && 
                    req.Method == HttpMethod.Post),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK
            });

        var httpClient = new HttpClient(_httpHandlerMock.Object)
        {
            BaseAddress = new Uri("http://recording-worker:5003")
        };

        var recordingWorkerService = new Backend.Services.Services.RecordingWorkerService(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new Backend.Services.Models.RecordingWorkerSettings
            {
                BaseUrl = "http://recording-worker:5003",
                ApiKey = "test-api-key"
            }));

        // Act
        await recordingWorkerService.StopAsync(
            Guid.NewGuid(),
            CancellationToken.None);

        // Assert
        _httpHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.ToString().Contains("recording/stop")),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task StartRecording_WhenUnavailable_HandlesGracefully()
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
            BaseAddress = new Uri("http://recording-worker:5003")
        };

        var recordingWorkerService = new Backend.Services.Services.RecordingWorkerService(
            httpClient,
            Microsoft.Extensions.Options.Options.Create(new Backend.Services.Models.RecordingWorkerSettings
            {
                BaseUrl = "http://recording-worker:5003",
                ApiKey = "test-api-key"
            }));

        // Act & Assert - service wraps HTTP errors in InvalidOperationException
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await recordingWorkerService.StartAsync(
                Guid.NewGuid(),
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
