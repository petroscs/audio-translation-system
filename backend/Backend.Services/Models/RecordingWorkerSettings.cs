namespace Backend.Services.Models;

public sealed class RecordingWorkerSettings
{
    public string BaseUrl { get; set; } = "http://localhost:5003";

    public string ApiKey { get; set; } = "recording-worker-secret";
}
