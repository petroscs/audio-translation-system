import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/auth_tokens.dart';

class AuthService {
  AuthService({FlutterSecureStorage? storage, http.Client? client})
      : _storage = storage ?? const FlutterSecureStorage(),
        _client = client ?? http.Client();

  final FlutterSecureStorage _storage;
  final http.Client _client;

  AuthTokens? _tokens;

  bool get isAuthenticated => _tokens != null && !_tokens!.isExpired;
  bool get isAdmin {
    final token = _tokens?.accessToken;
    if (token == null || token.isEmpty) {
      return false;
    }

    try {
      final parts = token.split('.');
      if (parts.length < 2) {
        return false;
      }

      final normalized = base64Url.normalize(parts[1]);
      final payloadJson = utf8.decode(base64Url.decode(normalized));
      final payload = jsonDecode(payloadJson);
      if (payload is! Map<String, dynamic>) {
        return false;
      }

      const roleClaimUri = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
      final dynamic roleValue = payload['role'] ?? payload[roleClaimUri];
      if (roleValue is String) {
        return roleValue.toLowerCase() == 'admin';
      }
      if (roleValue is List) {
        return roleValue.any((value) => value.toString().toLowerCase() == 'admin');
      }
    } catch (_) {
      return false;
    }

    return false;
  }
  String? get accessToken => _tokens?.accessToken;
  String? get refreshToken => _tokens?.refreshToken;

  Future<AuthTokens?> loadTokens() async {
    final accessToken = await _storage.read(key: 'accessToken');
    final refreshToken = await _storage.read(key: 'refreshToken');
    final expiresAtRaw = await _storage.read(key: 'expiresAt');

    if (accessToken == null || refreshToken == null || expiresAtRaw == null) {
      _tokens = null;
      return null;
    }

    _tokens = AuthTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: DateTime.parse(expiresAtRaw),
    );
    return _tokens;
  }

  Future<AuthTokens> login(String usernameOrEmail, String password) async {
    final response = await _client.post(
      ApiConfig.apiUri('/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'usernameOrEmail': usernameOrEmail,
        'password': password,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Login failed (${response.statusCode}).');
    }

    final tokens = AuthTokens.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
    await _persistTokens(tokens);
    return tokens;
  }

  Future<AuthTokens?> refresh() async {
    if (_tokens?.refreshToken == null) {
      return null;
    }

    final response = await _client.post(
      ApiConfig.apiUri('/api/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': _tokens!.refreshToken}),
    );

    if (response.statusCode != 200) {
      return null;
    }

    final tokens = AuthTokens.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
    await _persistTokens(tokens);
    return tokens;
  }

  Future<void> logout() async {
    if (_tokens?.refreshToken != null) {
      await _client.post(
        ApiConfig.apiUri('/api/auth/logout'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': _tokens!.refreshToken}),
      );
    }
    await _clearTokens();
  }

  Future<void> _persistTokens(AuthTokens tokens) async {
    _tokens = tokens;
    await _storage.write(key: 'accessToken', value: tokens.accessToken);
    await _storage.write(key: 'refreshToken', value: tokens.refreshToken);
    await _storage.write(key: 'expiresAt', value: tokens.expiresAt.toIso8601String());
  }

  Future<void> _clearTokens() async {
    _tokens = null;
    await _storage.delete(key: 'accessToken');
    await _storage.delete(key: 'refreshToken');
    await _storage.delete(key: 'expiresAt');
  }
}
