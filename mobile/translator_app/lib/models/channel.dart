class Channel {
  Channel({
    required this.id,
    required this.eventId,
    required this.name,
    required this.languageCode,
  });

  final String id;
  final String eventId;
  final String name;
  final String languageCode;

  factory Channel.fromJson(Map<String, dynamic> json) {
    return Channel(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      name: json['name'] as String? ?? '',
      languageCode: json['languageCode'] as String? ?? '',
    );
  }
}
