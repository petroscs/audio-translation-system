using System.Security.Claims;
using Backend.Api.Contracts.Sessions;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/sessions")]
[Authorize]
public sealed class SessionsController : ControllerBase
{
    private readonly ISessionService _sessionService;
    private readonly IEventService _eventService;
    private readonly IChannelService _channelService;
    private readonly ICaptionService _captionService;
    private readonly IMediasoupService _mediasoupService;

    public SessionsController(
        ISessionService sessionService,
        IEventService eventService,
        IChannelService channelService,
        ICaptionService captionService,
        IMediasoupService mediasoupService)
    {
        _sessionService = sessionService;
        _eventService = eventService;
        _channelService = channelService;
        _captionService = captionService;
        _mediasoupService = mediasoupService;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SessionResponse>>> GetAll(
        [FromQuery] Guid? eventId,
        [FromQuery] Guid? channelId,
        [FromQuery] SessionStatus? status,
        CancellationToken cancellationToken)
    {
        // Pass null to get all sessions when status is not provided
        var sessions = await _sessionService.GetAsync(eventId, channelId, status, cancellationToken);
        var response = sessions.Select(MapSession).ToList();
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var session = await _sessionService.GetByIdAsync(id, cancellationToken);
        if (session is null)
        {
            return NotFound();
        }

        if (!IsAdmin() && session.UserId != GetCurrentUserId())
        {
            return Forbid();
        }

        return Ok(MapSession(session));
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SessionResponse>> Create([FromBody] CreateSessionRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (request.EventId == Guid.Empty)
        {
            return BadRequest("EventId is required.");
        }

        if (request.ChannelId == Guid.Empty)
        {
            return BadRequest("ChannelId is required.");
        }

        if (request.Role == SessionRole.Translator && !IsRoleAllowed(UserRole.Translator))
        {
            return Forbid();
        }

        if (request.Role == SessionRole.Listener && !IsRoleAllowed(UserRole.Listener))
        {
            return Forbid();
        }

        var evt = await _eventService.GetByIdAsync(request.EventId, cancellationToken);
        if (evt is null)
        {
            return NotFound("Event not found.");
        }

        var channel = await _channelService.GetByIdAsync(request.ChannelId, cancellationToken);
        if (channel is null)
        {
            return NotFound("Channel not found.");
        }

        if (channel.EventId != request.EventId)
        {
            return BadRequest("Channel does not belong to the specified event.");
        }

        var session = await _sessionService.CreateAsync(
            userId.Value,
            request.EventId,
            request.ChannelId,
            request.Role,
            cancellationToken);

        if (session is null)
        {
            return Conflict("An active session already exists for this channel.");
        }

        return CreatedAtAction(nameof(GetById), new { id = session.Id }, MapSession(session));
    }

    [HttpPut("{id:guid}/end")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionResponse>> End(Guid id, CancellationToken cancellationToken)
    {
        var session = await _sessionService.GetByIdAsync(id, cancellationToken);
        if (session is null)
        {
            return NotFound();
        }

        if (!IsAdmin() && session.UserId != GetCurrentUserId())
        {
            return Forbid();
        }

        var ended = await _sessionService.EndAsync(id, cancellationToken);
        return Ok(MapSession(ended!));
    }

    [HttpGet("{id:guid}/captions")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<CaptionResponse>>> GetCaptions(Guid id, CancellationToken cancellationToken)
    {
        var session = await _sessionService.GetByIdAsync(id, cancellationToken);
        if (session is null)
        {
            return NotFound();
        }

        if (!IsAdmin() && session.UserId != GetCurrentUserId())
        {
            return Forbid();
        }

        var captions = await _captionService.GetSessionCaptionsAsync(id, cancellationToken);
        var response = captions.Select(c => new CaptionResponse(c.Id, c.Text, c.Timestamp, c.Confidence, c.CreatedAt)).ToList();
        return Ok(response);
    }

    [HttpGet("{id:guid}/producer-stats")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Dictionary<string, object>>> GetProducerStats(Guid id, [FromQuery] string mediasoupProducerId, CancellationToken cancellationToken)
    {
        var session = await _sessionService.GetByIdAsync(id, cancellationToken);
        if (session is null)
        {
            return NotFound();
        }

        if (!IsAdmin() && session.UserId != GetCurrentUserId())
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(mediasoupProducerId))
        {
            return BadRequest("mediasoupProducerId is required.");
        }

        try
        {
            var stats = await _mediasoupService.GetProducerStatsAsync(mediasoupProducerId, cancellationToken);
            return Ok(stats);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
    }

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var userId) ? userId : null;
    }

    private bool IsAdmin()
    {
        return User.IsInRole(UserRole.Admin.ToString());
    }

    private bool IsRoleAllowed(UserRole role)
    {
        return IsAdmin() || User.IsInRole(role.ToString());
    }

    private static SessionResponse MapSession(Backend.Models.Entities.Session session)
    {
        return new SessionResponse
        {
            Id = session.Id,
            UserId = session.UserId,
            EventId = session.EventId,
            ChannelId = session.ChannelId,
            Role = session.Role,
            Status = session.Status,
            StartedAt = session.StartedAt,
            EndedAt = session.EndedAt
        };
    }
}
