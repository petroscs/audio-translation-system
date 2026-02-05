using Backend.Api.Contracts.Channels;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public sealed class ChannelsController : ControllerBase
{
    private readonly IChannelService _channelService;
    private readonly IEventService _eventService;

    public ChannelsController(IChannelService channelService, IEventService eventService)
    {
        _channelService = channelService;
        _eventService = eventService;
    }

    [HttpGet("events/{eventId:guid}/channels")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ChannelResponse>>> GetByEvent(Guid eventId, CancellationToken cancellationToken)
    {
        var evt = await _eventService.GetByIdAsync(eventId, cancellationToken);
        if (evt is null)
        {
            return NotFound();
        }

        var channels = await _channelService.GetByEventAsync(eventId, cancellationToken);
        var response = channels.Select(MapChannel).ToList();
        return Ok(response);
    }

    [HttpPost("events/{eventId:guid}/channels")]
    [Authorize(Roles = "Admin,Translator")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ChannelResponse>> Create(Guid eventId, [FromBody] CreateChannelRequest request, CancellationToken cancellationToken)
    {
        var evt = await _eventService.GetByIdAsync(eventId, cancellationToken);
        if (evt is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Channel name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.LanguageCode))
        {
            return BadRequest("Language code is required.");
        }

        var channel = await _channelService.CreateAsync(eventId, request.Name, request.LanguageCode, cancellationToken);
        if (channel is null)
        {
            return Conflict("Channel already exists for this event.");
        }

        return CreatedAtAction(nameof(GetById), new { id = channel.Id }, MapChannel(channel));
    }

    [HttpGet("channels/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChannelResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var channel = await _channelService.GetByIdAsync(id, cancellationToken);
        if (channel is null)
        {
            return NotFound();
        }

        return Ok(MapChannel(channel));
    }

    [HttpPut("channels/{id:guid}")]
    [Authorize(Roles = "Admin,Translator")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ChannelResponse>> Update(Guid id, [FromBody] UpdateChannelRequest request, CancellationToken cancellationToken)
    {
        var existing = await _channelService.GetByIdAsync(id, cancellationToken);
        if (existing is null)
        {
            return NotFound();
        }

        if (request.Name is not null && string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Channel name cannot be empty.");
        }

        if (request.LanguageCode is not null && string.IsNullOrWhiteSpace(request.LanguageCode))
        {
            return BadRequest("Language code cannot be empty.");
        }

        var targetName = request.Name?.Trim() ?? existing.Name;
        var targetLanguage = request.LanguageCode?.Trim() ?? existing.LanguageCode;

        if ((request.Name is not null || request.LanguageCode is not null)
            && await _channelService.ExistsAsync(existing.EventId, targetName, targetLanguage, existing.Id, cancellationToken))
        {
            return Conflict("Channel already exists for this event.");
        }

        var channel = await _channelService.UpdateAsync(id, request.Name, request.LanguageCode, cancellationToken);
        return Ok(MapChannel(channel!));
    }

    [HttpDelete("channels/{id:guid}")]
    [Authorize(Roles = "Admin,Translator")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var removed = await _channelService.DeleteAsync(id, cancellationToken);
        return removed ? NoContent() : NotFound();
    }

    private static ChannelResponse MapChannel(Backend.Models.Entities.Channel channel)
    {
        return new ChannelResponse
        {
            Id = channel.Id,
            EventId = channel.EventId,
            Name = channel.Name,
            LanguageCode = channel.LanguageCode,
            CreatedAt = channel.CreatedAt
        };
    }
}
