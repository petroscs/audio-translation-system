namespace Backend.Services.Models;

public sealed class ListenSettings
{
    public bool AnonymousEnabled { get; set; } = true;

    /// <summary>
    /// Optional base URL for the web listener (e.g. https://listener.example.com).
    /// When set, QR codes and /api/listen/base-url use this instead of resolving the server IP.
    /// </summary>
    public string? WebBaseUrl { get; set; }

    /// <summary>
    /// Port for the web listener when WebBaseUrl is not set and the URL is built from the server's LAN IP. Default 3001.
    /// </summary>
    public int WebPort { get; set; } = 3001;
}
