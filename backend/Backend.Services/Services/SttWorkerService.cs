using System.Net.Http.Json;
using System.Text.Json;
using Backend.Services.Interfaces;
using Backend.Services.Models;
using Microsoft.Extensions.Options;

namespace Backend.Services.Services;

public sealed class SttWorkerService : ISttWorkerService
{
    private readonly HttpClient _httpClient;
    private readonly SttWorkerSettings _settings;
    private readonly JsonSerializerOptions _serializerOptions = new(JsonSerializerDefaults.Web);

    public SttWorkerService(HttpClient httpClient, IOptions<SttWorkerSettings> options)
    {
        _httpClient = httpClient;
        _settings = options.Value;

        if (_httpClient.BaseAddress is null && Uri.TryCreate(_settings.BaseUrl, UriKind.Absolute, out var baseUri))
        {
            _httpClient.BaseAddress = baseUri;
        }
    }

    public async Task StartAsync(Guid sessionId, Guid eventId, Guid channelId, Guid producerId, string mediasoupProducerId, CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            sessionId,
            eventId,
            channelId,
            producerId,
            mediasoupProducerId
        };

        using var response = await _httpClient.PostAsJsonAsync("stt/start", payload, _serializerOptions, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(
                $"STT worker start failed ({response.StatusCode}): {errorBody}");
        }
    }

    public async Task StopAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        var payload = new { sessionId };

        using var response = await _httpClient.PostAsJsonAsync("stt/stop", payload, _serializerOptions, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(
                $"STT worker stop failed ({response.StatusCode}): {errorBody}");
        }
    }
}
