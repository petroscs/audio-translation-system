import 'dart:convert';

import '../models/channel.dart';
import '../models/event.dart';
import 'api_client.dart';

class EventService {
  EventService(this._apiClient);

  final ApiClient _apiClient;

  Future<List<Event>> fetchEvents() async {
    final response = await _apiClient.get('/api/events');
    if (response.statusCode != 200) {
      throw Exception('Failed to load events (${response.statusCode}).');
    }

    final data = jsonDecode(response.body) as List<dynamic>;
    return data.map((item) => Event.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<List<Channel>> fetchChannels(String eventId) async {
    final response = await _apiClient.get('/api/events/$eventId/channels');
    if (response.statusCode != 200) {
      throw Exception('Failed to load channels (${response.statusCode}).');
    }

    final data = jsonDecode(response.body) as List<dynamic>;
    return data.map((item) => Channel.fromJson(item as Map<String, dynamic>)).toList();
  }
}
