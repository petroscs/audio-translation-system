import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'auth_service.dart';

class ApiClient {
  ApiClient(this._authService, {http.Client? client}) : _client = client ?? http.Client();

  final AuthService _authService;
  final http.Client _client;

  Future<http.Response> get(String path) async {
    return _sendWithRefresh(
      () => _client.get(ApiConfig.apiUri(path), headers: _headers()),
    );
  }

  Future<http.Response> post(String path, Object? body) async {
    return _sendWithRefresh(
      () => _client.post(
        ApiConfig.apiUri(path),
        headers: _headers(),
        body: jsonEncode(body ?? {}),
      ),
    );
  }

  Future<http.Response> put(String path, Object? body) async {
    return _sendWithRefresh(
      () => _client.put(
        ApiConfig.apiUri(path),
        headers: _headers(),
        body: jsonEncode(body ?? {}),
      ),
    );
  }

  Map<String, String> _headers() {
    final headers = {'Content-Type': 'application/json'};
    final token = _authService.accessToken;
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<http.Response> _sendWithRefresh(Future<http.Response> Function() send) async {
    final response = await send();
    if (response.statusCode != 401) {
      return response;
    }

    final refreshed = await _authService.refresh();
    if (refreshed == null) {
      return response;
    }

    return send();
  }
}
