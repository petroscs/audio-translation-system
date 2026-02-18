using System.Net;
using Backend.Api.Contracts.Listen;
using Backend.Services.Interfaces;
using Backend.Services.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/listen")]
[AllowAnonymous]
public sealed class ListenController : ControllerBase
{
    private readonly IListenService _listenService;
    private readonly ListenSettings _listenSettings;

    public ListenController(IListenService listenService, Microsoft.Extensions.Options.IOptions<ListenSettings> listenSettings)
    {
        _listenService = listenService;
        _listenSettings = listenSettings.Value;
    }

    /// <summary>
    /// Returns the base URL for the web listener (for QR codes). Uses Listen:WebBaseUrl if set;
    /// otherwise builds http://{server LAN IP}:{WebPort} so scanners can reach the listener.
    /// </summary>
    [HttpGet("base-url")]
    [ProducesResponseType(typeof(ListenerBaseUrlResponse), StatusCodes.Status200OK)]
    public ActionResult<ListenerBaseUrlResponse> GetListenerBaseUrl()
    {
        var baseUrl = !string.IsNullOrWhiteSpace(_listenSettings.WebBaseUrl)
            ? _listenSettings.WebBaseUrl.TrimEnd('/')
            : GetListenerBaseUrlFromHost();

        return Ok(new ListenerBaseUrlResponse { ListenerBaseUrl = baseUrl });
    }

    private string GetListenerBaseUrlFromHost()
    {
        try
        {
            var hostName = Dns.GetHostName();
            var addresses = Dns.GetHostEntry(hostName).AddressList;
            var firstLanIp = addresses.FirstOrDefault(a =>
                a.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork && !IPAddress.IsLoopback(a));

            var host = firstLanIp?.ToString() ?? "localhost";
            var port = _listenSettings.WebPort > 0 ? _listenSettings.WebPort : 3001;
            return $"http://{host}:{port}";
        }
        catch
        {
            return $"http://localhost:{(_listenSettings.WebPort > 0 ? _listenSettings.WebPort : 3001)}";
        }
    }

    [HttpGet("broadcasts")]
    [ProducesResponseType(typeof(IReadOnlyList<ActiveBroadcastResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ActiveBroadcastResponse>>> GetActiveBroadcasts(CancellationToken cancellationToken)
    {
        var items = await _listenService.GetActiveBroadcastsAsync(cancellationToken);
        var response = items.Select(i => new ActiveBroadcastResponse
        {
            BroadcastSessionId = i.BroadcastSessionId,
            EventName = i.EventName,
            ChannelName = i.ChannelName
        }).ToList();
        return Ok(response);
    }

    [HttpPost("join")]
    [ProducesResponseType(typeof(ListenJoinResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ListenJoinResponse>> Join([FromBody] ListenJoinRequest request, CancellationToken cancellationToken)
    {
        var result = await _listenService.JoinAsync(request.BroadcastSessionId, cancellationToken);
        if (result is null)
        {
            return NotFound("No active broadcast for this session.");
        }

        return Ok(new ListenJoinResponse
        {
            AccessToken = result.AccessToken,
            ListenerSessionId = result.ListenerSessionId,
            ProducerId = result.ProducerId,
            EventId = result.EventId,
            ChannelId = result.ChannelId,
            EventName = result.EventName,
            ChannelName = result.ChannelName
        });
    }
}
