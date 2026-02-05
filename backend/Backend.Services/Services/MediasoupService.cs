using System.Net.Http.Json;
using System.Text.Json;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Backend.Services.Models;
using Microsoft.Extensions.Options;

namespace Backend.Services.Services;

public sealed class MediasoupService : IMediasoupService
{
    private readonly HttpClient _httpClient;
    private readonly MediasoupSettings _settings;
    private readonly JsonSerializerOptions _serializerOptions = new(JsonSerializerDefaults.Web);

    public MediasoupService(HttpClient httpClient, IOptions<MediasoupSettings> options)
    {
        _httpClient = httpClient;
        _settings = options.Value;

        if (_httpClient.BaseAddress is null && Uri.TryCreate(_settings.BaseUrl, UriKind.Absolute, out var baseUri))
        {
            _httpClient.BaseAddress = baseUri;
        }
    }

    public async Task<MediasoupTransportResult> CreateTransportAsync(
        Guid sessionId,
        TransportDirection direction,
        CancellationToken cancellationToken)
    {
        var payload = new
        {
            sessionId,
            direction = direction.ToString().ToLowerInvariant()
        };

        var result = await PostWithRetryAsync<MediasoupTransportResult>(
            "mediasoup/transport/create",
            payload,
            cancellationToken);

        return result;
    }

    public async Task ConnectTransportAsync(
        string mediasoupTransportId,
        string dtlsParameters,
        CancellationToken cancellationToken)
    {
        var payload = new
        {
            transportId = mediasoupTransportId,
            dtlsParameters
        };

        await PostWithRetryAsync<object>(
            "mediasoup/transport/connect",
            payload,
            cancellationToken);
    }

    public async Task<MediasoupProducerResult> CreateProducerAsync(
        string mediasoupTransportId,
        MediaKind kind,
        string rtpParameters,
        CancellationToken cancellationToken)
    {
        var payload = new
        {
            transportId = mediasoupTransportId,
            kind = kind.ToString().ToLowerInvariant(),
            rtpParameters
        };

        var result = await PostWithRetryAsync<MediasoupProducerResult>(
            "mediasoup/producer/create",
            payload,
            cancellationToken);

        return result;
    }

    public async Task<MediasoupConsumerResult> CreateConsumerAsync(
        string mediasoupTransportId,
        string mediasoupProducerId,
        CancellationToken cancellationToken)
    {
        var payload = new
        {
            transportId = mediasoupTransportId,
            producerId = mediasoupProducerId
        };

        var result = await PostWithRetryAsync<MediasoupConsumerResult>(
            "mediasoup/consumer/create",
            payload,
            cancellationToken);

        return result;
    }

    private async Task<T> PostWithRetryAsync<T>(string path, object payload, CancellationToken cancellationToken)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt += 1)
        {
            try
            {
                using var response = await _httpClient.PostAsJsonAsync(path, payload, _serializerOptions, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    throw new InvalidOperationException(
                        $"Mediasoup request failed ({response.StatusCode}): {errorBody}");
                }

                var result = await response.Content.ReadFromJsonAsync<T>(_serializerOptions, cancellationToken);
                if (result is null)
                {
                    throw new InvalidOperationException("Mediasoup response was empty.");
                }

                return result;
            }
            catch (Exception ex) when (attempt < maxAttempts
                && (ex is HttpRequestException or TaskCanceledException))
            {
                await Task.Delay(TimeSpan.FromMilliseconds(200 * attempt), cancellationToken);
            }
        }

        throw new InvalidOperationException("Mediasoup request failed after retries.");
    }
}
