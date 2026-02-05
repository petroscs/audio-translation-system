using System.IO;
using Backend.Api.Contracts.Recordings;
using Backend.Models.Enums;
using Backend.Services.Interfaces;
using Backend.Services.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/recordings")]
public sealed class RecordingsController : ControllerBase
{
    private readonly IRecordingService _recordingService;
    private readonly IConfiguration _configuration;
    private readonly RecordingsSettings _recordingsSettings;

    public RecordingsController(
        IRecordingService recordingService,
        IConfiguration configuration,
        Microsoft.Extensions.Options.IOptions<RecordingsSettings> recordingsSettings)
    {
        _recordingService = recordingService;
        _configuration = configuration;
        _recordingsSettings = recordingsSettings.Value;
    }

    [HttpPost("complete")]
    [AllowAnonymous]
    public async Task<IActionResult> Complete([FromBody] CompleteRecordingRequest request, CancellationToken cancellationToken)
    {
        if (!ValidateRecordingWorkerKey())
        {
            return Unauthorized();
        }

        try
        {
            var recording = await _recordingService.CompleteRecordingAsync(
                request.SessionId,
                request.FilePath,
                request.DurationSeconds,
                cancellationToken);

            return StatusCode(201, new { id = recording.Id });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<object>>> GetList(
        [FromQuery] Guid? eventId,
        [FromQuery] Guid? channelId,
        [FromQuery] Guid? sessionId,
        CancellationToken cancellationToken)
    {
        var recordings = await _recordingService.GetAsync(eventId, channelId, sessionId, cancellationToken);
        var response = recordings.Select(r => new
        {
            r.Id,
            r.SessionId,
            r.FilePath,
            r.DurationSeconds,
            r.StartedAt,
            r.EndedAt,
            Status = r.Status.ToString()
        }).ToList();
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var recording = await _recordingService.GetByIdAsync(id, cancellationToken);
        if (recording is null)
        {
            return NotFound();
        }

        return Ok(new
        {
            recording.Id,
            recording.SessionId,
            recording.FilePath,
            recording.DurationSeconds,
            recording.StartedAt,
            recording.EndedAt,
            Status = recording.Status.ToString()
        });
    }

    [HttpGet("{id:guid}/download")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Download(Guid id, CancellationToken cancellationToken)
    {
        var recording = await _recordingService.GetByIdAsync(id, cancellationToken);
        if (recording is null)
        {
            return NotFound();
        }

        if (recording.Status != RecordingStatus.Completed)
        {
            return NotFound();
        }

        var basePath = Path.GetFullPath(_recordingsSettings.Path);
        var fullPath = Path.GetFullPath(Path.Combine(basePath, recording.FilePath));

        if (!fullPath.StartsWith(basePath, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Invalid path.");
        }

        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound();
        }

        var contentType = fullPath.EndsWith(".opus", StringComparison.OrdinalIgnoreCase)
            ? "audio/opus"
            : "application/octet-stream";

        return PhysicalFile(fullPath, contentType, Path.GetFileName(fullPath), enableRangeProcessing: true);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _recordingService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpGet("~/api/sessions/{sessionId:guid}/recording")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> GetBySessionId(Guid sessionId, CancellationToken cancellationToken)
    {
        var recording = await _recordingService.GetBySessionIdAsync(sessionId, cancellationToken);
        if (recording is null)
        {
            return NotFound();
        }

        return Ok(new
        {
            recording.Id,
            recording.SessionId,
            recording.FilePath,
            recording.DurationSeconds,
            recording.StartedAt,
            recording.EndedAt,
            Status = recording.Status.ToString()
        });
    }

    private bool ValidateRecordingWorkerKey()
    {
        var expectedKey = _configuration["RecordingWorker:ApiKey"] ?? "recording-worker-secret";
        var actualKey = Request.Headers["X-Recording-Worker-Key"].FirstOrDefault();
        return !string.IsNullOrEmpty(actualKey) && actualKey == expectedKey;
    }
}
