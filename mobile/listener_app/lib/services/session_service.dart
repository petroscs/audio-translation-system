import 'dart:convert';

import '../models/enums.dart';
import '../models/session.dart';
import '../models/session_join_info.dart';
import 'api_client.dart';

class SessionService {
  SessionService(this._apiClient);

  final ApiClient _apiClient;

  Future<Session> createSession({
    required String eventId,
    required String channelId,
    required SessionRole role,
  }) async {
    final response = await _apiClient.post('/api/sessions', {
      'eventId': eventId,
      'channelId': channelId,
      'role': role.apiValue,
    });

    if (response.statusCode != 201) {
      final errorBody = response.body.isNotEmpty ? ': ${response.body}' : '';
      if (response.statusCode == 403) {
        throw Exception('Access denied. Your account may not have the Listener role assigned.$errorBody');
      }
      throw Exception('Failed to create session (${response.statusCode})$errorBody');
    }

    return Session.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<Session> endSession(String sessionId) async {
    final response = await _apiClient.put('/api/sessions/$sessionId/end', {});
    if (response.statusCode != 200) {
      throw Exception('Failed to end session (${response.statusCode}).');
    }

    return Session.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  /// Fetch producer ID + event/channel info for a session.
  /// Returns null when the session has no active broadcast.
  Future<SessionJoinInfo?> getActiveProducerJoinInfo(String sessionId) async {
    final response = await _apiClient.get('/api/sessions/$sessionId/active-producer');
    if (response.statusCode == 404) {
      return null;
    }
    if (response.statusCode != 200) {
      throw Exception('Failed to get session info (${response.statusCode}).');
    }
    return SessionJoinInfo.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }
}
