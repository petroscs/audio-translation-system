using System.Collections.Concurrent;
using System.Security.Claims;
using Backend.Api.Contracts.Signaling;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Api.Hubs;

[Authorize]
public sealed class SignalingHub : Hub
{
    private static readonly ConcurrentDictionary<string, Guid> ConnectionSessions = new();
    private readonly ISignalingService _signalingService;
    private readonly ISessionService _sessionService;

    public SignalingHub(ISignalingService signalingService, ISessionService sessionService)
    {
        _signalingService = signalingService;
        _sessionService = sessionService;
    }

    public async Task<TransportCreatedResponse> CreateTransport(CreateTransportRequest request)
    {
        if (request.SessionId == Guid.Empty)
        {
            throw new HubException("SessionId is required.");
        }

        var userId = GetUserId();
        if (userId is null)
        {
            throw new HubException("Unauthorized.");
        }

        try
        {
            var result = await _signalingService.CreateTransportAsync(
                request.SessionId,
                userId.Value,
                IsAdmin(),
                request.Direction,
                Context.ConnectionAborted);

            ConnectionSessions.AddOrUpdate(Context.ConnectionId, request.SessionId, (_, _) => request.SessionId);

            return new TransportCreatedResponse
            {
                TransportId = result.TransportId,
                MediasoupTransportId = result.MediasoupTransportId,
                IceParameters = result.IceParameters,
                IceCandidates = result.IceCandidates,
                DtlsParameters = result.DtlsParameters
            };
        }
        catch (InvalidOperationException ex)
        {
            throw new HubException(ex.Message);
        }
    }

    public async Task ConnectTransport(ConnectTransportRequest request)
    {
        if (request.TransportId == Guid.Empty)
        {
            throw new HubException("TransportId is required.");
        }

        if (string.IsNullOrWhiteSpace(request.DtlsParameters))
        {
            throw new HubException("DtlsParameters are required.");
        }

        var userId = GetUserId();
        if (userId is null)
        {
            throw new HubException("Unauthorized.");
        }

        try
        {
            await _signalingService.ConnectTransportAsync(
                request.TransportId,
                userId.Value,
                IsAdmin(),
                request.DtlsParameters,
                Context.ConnectionAborted);
        }
        catch (InvalidOperationException ex)
        {
            throw new HubException(ex.Message);
        }
    }

    public async Task<ProducerCreatedResponse> Produce(ProduceRequest request)
    {
        if (request.TransportId == Guid.Empty)
        {
            throw new HubException("TransportId is required.");
        }

        if (string.IsNullOrWhiteSpace(request.RtpParameters))
        {
            throw new HubException("RtpParameters are required.");
        }

        var userId = GetUserId();
        if (userId is null)
        {
            throw new HubException("Unauthorized.");
        }

        try
        {
            var result = await _signalingService.ProduceAsync(
                request.TransportId,
                userId.Value,
                IsAdmin(),
                request.Kind,
                request.RtpParameters,
                Context.ConnectionAborted);

            return new ProducerCreatedResponse
            {
                ProducerId = result.ProducerId,
                MediasoupProducerId = result.MediasoupProducerId
            };
        }
        catch (InvalidOperationException ex)
        {
            throw new HubException(ex.Message);
        }
    }

    public async Task<ConsumerCreatedResponse> Consume(ConsumeRequest request)
    {
        if (request.TransportId == Guid.Empty)
        {
            throw new HubException("TransportId is required.");
        }

        if (request.ProducerId == Guid.Empty)
        {
            throw new HubException("ProducerId is required.");
        }

        var userId = GetUserId();
        if (userId is null)
        {
            throw new HubException("Unauthorized.");
        }

        try
        {
            var result = await _signalingService.ConsumeAsync(
                request.TransportId,
                userId.Value,
                IsAdmin(),
                request.ProducerId,
                Context.ConnectionAborted);

            return new ConsumerCreatedResponse
            {
                ConsumerId = result.ConsumerId,
                MediasoupConsumerId = result.MediasoupConsumerId,
                MediasoupProducerId = result.MediasoupProducerId,
                RtpParameters = result.RtpParameters
            };
        }
        catch (InvalidOperationException ex)
        {
            throw new HubException(ex.Message);
        }
    }

    public async Task JoinSession(Guid sessionId)
    {
        if (sessionId == Guid.Empty)
        {
            throw new HubException("SessionId is required.");
        }

        var userId = GetUserId();
        if (userId is null)
        {
            throw new HubException("Unauthorized.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"session:{sessionId}");
    }

    public async Task SubscribeToBroadcastSession(Guid sessionId)
    {
        if (sessionId == Guid.Empty)
        {
            throw new HubException("SessionId is required.");
        }

        var userId = GetUserId();
        if (userId is null)
        {
            throw new HubException("Unauthorized.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"session:{sessionId}");
    }

    public async Task UnsubscribeFromBroadcastSession(Guid sessionId)
    {
        if (sessionId == Guid.Empty)
        {
            throw new HubException("SessionId is required.");
        }

        var userId = GetUserId();
        if (userId is null)
        {
            throw new HubException("Unauthorized.");
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"session:{sessionId}");
    }

    public Task<string> Ping()
    {
        return Task.FromResult("pong");
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (ConnectionSessions.TryRemove(Context.ConnectionId, out var sessionId))
        {
            var session = await _sessionService.GetByIdAsync(sessionId, Context.ConnectionAborted);
            if (session is not null && session.Status == SessionStatus.Active && session.Role == SessionRole.Listener)
            {
                await _sessionService.EndAsync(sessionId, Context.ConnectionAborted);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private Guid? GetUserId()
    {
        var claim = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var userId) ? userId : null;
    }

    private bool IsAdmin()
    {
        return Context.User?.IsInRole(UserRole.Admin.ToString()) ?? false;
    }
}
