class SessionJoinInfo {
  SessionJoinInfo({
    required this.producerId,
    required this.eventId,
    required this.channelId,
  });

  final String producerId;
  final String eventId;
  final String channelId;

  factory SessionJoinInfo.fromJson(Map<String, dynamic> json) {
    return SessionJoinInfo(
      producerId: json['producerId'] as String,
      eventId: json['eventId'] as String,
      channelId: json['channelId'] as String,
    );
  }
}
