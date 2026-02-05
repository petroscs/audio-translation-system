using Backend.Api.Contracts.Captions;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/captions")]
public sealed class CaptionsController : ControllerBase
{
    private readonly ICaptionService _captionService;
    private readonly IConfiguration _configuration;

    public CaptionsController(ICaptionService captionService, IConfiguration configuration)
    {
        _captionService = captionService;
        _configuration = configuration;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCaptionRequest request, CancellationToken cancellationToken)
    {
        if (!ValidateSttWorkerKey())
        {
            return Unauthorized();
        }

        try
        {
            await _captionService.AddCaptionAsync(
                request.SessionId,
                request.Text,
                request.Timestamp,
                request.Confidence,
                cancellationToken);

            return StatusCode(201);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    private bool ValidateSttWorkerKey()
    {
        var expectedKey = _configuration["SttWorker:ApiKey"] ?? "stt-worker-secret";
        var actualKey = Request.Headers["X-STT-Worker-Key"].FirstOrDefault();
        return !string.IsNullOrEmpty(actualKey) && actualKey == expectedKey;
    }
}
