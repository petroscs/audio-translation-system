class Event {
  Event({
    required this.id,
    required this.name,
    this.description,
    this.startTime,
    this.endTime,
    required this.status,
  });

  final String id;
  final String name;
  final String? description;
  final DateTime? startTime;
  final DateTime? endTime;
  final String status;

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      startTime: json['startTime'] != null ? DateTime.parse(json['startTime'] as String) : null,
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime'] as String) : null,
      status: json['status'] as String? ?? 'Unknown',
    );
  }
}
