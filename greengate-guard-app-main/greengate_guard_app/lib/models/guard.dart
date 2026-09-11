class Guard {
  final String id;
  final String name;
  final String badgeNumber;
  final String societyName;
  final String assignedGate;
  final String shift;
  final String? avatarUrl;

  const Guard({
    required this.id,
    required this.name,
    required this.badgeNumber,
    required this.societyName,
    required this.assignedGate,
    required this.shift,
    this.avatarUrl,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'badgeNumber': badgeNumber,
        'societyName': societyName,
        'assignedGate': assignedGate,
        'shift': shift,
        'avatarUrl': avatarUrl,
      };

  factory Guard.fromJson(Map<String, dynamic> json) => Guard(
        id: json['id'] as String,
        name: json['name'] as String,
        badgeNumber: json['badgeNumber'] as String,
        societyName: json['societyName'] as String,
        assignedGate: json['assignedGate'] as String,
        shift: json['shift'] as String,
        avatarUrl: json['avatarUrl'] as String?,
      );
}
