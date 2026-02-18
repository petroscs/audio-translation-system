class ApiConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );

  /// Base URL for the web listener app (e.g. https://listener.example.com).
  /// Used when encoding the QR code so the QR always contains the full listen URL.
  /// Override with: flutter run --dart-define=LISTENER_WEB_BASE_URL=https://...
  /// When left at default (localhost:3001), the effective base URL is derived from
  /// the API host + port 3001 so the QR uses the same IP/host as the backend.
  static const String listenerWebBaseUrl = String.fromEnvironment(
    'LISTENER_WEB_BASE_URL',
    defaultValue: 'http://localhost:3001',
  );

  static const int _listenerWebPort = 3001;

  /// Listener base URL used for QR codes. When [listenerWebBaseUrl] is the default
  /// (localhost), uses the same host as [apiBaseUrl] with port [_listenerWebPort]
  /// so the QR encodes the machine's IP and other devices can scan and join.
  static String get effectiveListenerWebBaseUrl {
    const defaultBase = 'http://localhost:3001';
    if (listenerWebBaseUrl != defaultBase && listenerWebBaseUrl.isNotEmpty) {
      return listenerWebBaseUrl.replaceAll(RegExp(r'/$'), '');
    }
    final apiUri = Uri.parse(apiBaseUrl);
    return '${apiUri.scheme}://${apiUri.host}:$_listenerWebPort';
  }

  static const String signalingHubPath = '/ws/signaling';

  static Uri apiUri(String path) => Uri.parse('$apiBaseUrl$path');

  static Uri signalingUri() => Uri.parse('$apiBaseUrl$signalingHubPath');

  /// Returns the full web listener URL for the given broadcast session.
  /// The QR code always encodes this URL so scanning opens the web listener (or the native app can parse the session ID from it).
  static String listenUrl(String sessionId) {
    final base = effectiveListenerWebBaseUrl.replaceAll(RegExp(r'/$'), '');
    return '$base/listen/$sessionId';
  }
}
