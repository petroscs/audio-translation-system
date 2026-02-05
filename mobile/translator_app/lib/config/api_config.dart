class ApiConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5081',
  );

  static const String signalingHubPath = '/ws/signaling';

  static Uri apiUri(String path) => Uri.parse('$apiBaseUrl$path');

  static Uri signalingUri() => Uri.parse('$apiBaseUrl$signalingHubPath');
}
