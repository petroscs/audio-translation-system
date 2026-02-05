using System.Security.Claims;
using Backend.Api.Contracts.Events;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/events")]
[Authorize]
public sealed class EventsController : ControllerBase
{
    private readonly IEventService _eventService;

    public EventsController(IEventService eventService)
    {
        _eventService = eventService;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EventResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var events = await _eventService.GetAllAsync(cancellationToken);
        var response = events.Select(MapEvent).ToList();
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EventResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var evt = await _eventService.GetByIdAsync(id, cancellationToken);
        if (evt is null)
        {
            return NotFound();
        }

        return Ok(MapEvent(evt));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Translator")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<EventResponse>> Create([FromBody] CreateEventRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Event name is required.");
        }

        var timingError = ValidateEventTiming(request.StartTime, request.EndTime);
        if (timingError is not null)
        {
            return BadRequest(timingError);
        }

        var evt = await _eventService.CreateAsync(
            userId.Value,
            request.Name,
            request.Description,
            request.StartTime,
            request.EndTime,
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = evt.Id }, MapEvent(evt));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Translator")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EventResponse>> Update(Guid id, [FromBody] UpdateEventRequest request, CancellationToken cancellationToken)
    {
        var evt = await _eventService.GetByIdAsync(id, cancellationToken);
        if (evt is null)
        {
            return NotFound();
        }

        if (!IsAdmin() && evt.CreatedByUserId != GetCurrentUserId())
        {
            return Forbid();
        }

        if (request.Name is not null && string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Event name cannot be empty.");
        }

        var timingError = ValidateEventTiming(request.StartTime, request.EndTime);
        if (timingError is not null)
        {
            return BadRequest(timingError);
        }

        var updated = await _eventService.UpdateAsync(
            id,
            request.Name,
            request.Description,
            request.StartTime,
            request.EndTime,
            cancellationToken);

        return Ok(MapEvent(updated!));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Translator")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var evt = await _eventService.GetByIdAsync(id, cancellationToken);
        if (evt is null)
        {
            return NotFound();
        }

        if (!IsAdmin() && evt.CreatedByUserId != GetCurrentUserId())
        {
            return Forbid();
        }

        var removed = await _eventService.DeleteAsync(id, cancellationToken);
        return removed ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/start")]
    [Authorize(Roles = "Admin,Translator")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EventResponse>> Start(Guid id, CancellationToken cancellationToken)
    {
        var evt = await _eventService.GetByIdAsync(id, cancellationToken);
        if (evt is null)
        {
            return NotFound();
        }

        if (!IsAdmin() && evt.CreatedByUserId != GetCurrentUserId())
        {
            return Forbid();
        }

        var updated = await _eventService.StartAsync(id, cancellationToken);
        return Ok(MapEvent(updated!));
    }

    [HttpPost("{id:guid}/stop")]
    [Authorize(Roles = "Admin,Translator")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EventResponse>> Stop(Guid id, CancellationToken cancellationToken)
    {
        var evt = await _eventService.GetByIdAsync(id, cancellationToken);
        if (evt is null)
        {
            return NotFound();
        }

        if (!IsAdmin() && evt.CreatedByUserId != GetCurrentUserId())
        {
            return Forbid();
        }

        var updated = await _eventService.StopAsync(id, cancellationToken);
        return Ok(MapEvent(updated!));
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

    private static EventResponse MapEvent(Backend.Models.Entities.Event evt)
    {
        return new EventResponse
        {
            Id = evt.Id,
            Name = evt.Name,
            Description = evt.Description,
            StartTime = evt.StartTime,
            EndTime = evt.EndTime,
            Status = evt.Status,
            CreatedByUserId = evt.CreatedByUserId,
            CreatedAt = evt.CreatedAt,
            UpdatedAt = evt.UpdatedAt
        };
    }

    private static string? ValidateEventTiming(DateTime? startTime, DateTime? endTime)
    {
        if (startTime.HasValue && endTime.HasValue && endTime < startTime)
        {
            return "End time must be after start time.";
        }

        return null;
    }
}
