/// Model for in-app alerts and announcements.
class NotificationModel {
  final String id;
  final String type; // visitor, security, society, general
  final String title;
  final String message;
  final String? relatedEntityId;
  final bool read;
  final DateTime timestamp;

  const NotificationModel({
    required this.id,
    this.type = 'visitor',
    required this.title,
    required this.message,
    this.relatedEntityId,
    this.read = false,
    required this.timestamp,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    final rawDate = json['timestamp'] ?? json['createdAt'];
    return NotificationModel(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString().toLowerCase() ?? 'visitor',
      title: json['title']?.toString() ?? 'Notification',
      message: json['message']?.toString() ?? json['body']?.toString() ?? '',
      relatedEntityId: json['relatedEntityId']?.toString() ?? json['visitorId']?.toString(),
      read: json['read'] == true || json['read'] == 1,
      timestamp: rawDate != null
          ? DateTime.tryParse(rawDate.toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  NotificationModel copyWith({
    String? id,
    String? type,
    String? title,
    String? message,
    String? relatedEntityId,
    bool? read,
    DateTime? timestamp,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      message: message ?? this.message,
      relatedEntityId: relatedEntityId ?? this.relatedEntityId,
      read: read ?? this.read,
      timestamp: timestamp ?? this.timestamp,
    );
  }
}
