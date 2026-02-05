import 'enums.dart';

class Session {
  Session({
    required this.id,
    required this.userId,
    required this.eventId,
    required this.channelId,
    required this.role,
    required this.status,
    required this.startedAt,
    this.endedAt,
  });

  final String id;
  final String userId;
  final String eventId;
  final String channelId;
  final SessionRole role;
  final SessionStatus status;
  final DateTime startedAt;
  final DateTime? endedAt;

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      id: json['id'] as String,
      userId: json['userId'] as String,
      eventId: json['eventId'] as String,
      channelId: json['channelId'] as String,
      role: SessionRoleApi.fromApiValue(json['role'] as String? ?? 'Listener'),
      status: SessionStatusApi.fromApiValue(json['status'] as String? ?? 'Active'),
      startedAt: DateTime.parse(json['startedAt'] as String),
      endedAt: json['endedAt'] != null ? DateTime.parse(json['endedAt'] as String) : null,
    );
  }
}
