class Resident {
  final String id;
  final String name;
  final String phoneNumber;
  final String flatNumber;
  final String buildingWing;
  final bool isAtHome;

  const Resident({
    required this.id,
    required this.name,
    required this.phoneNumber,
    required this.flatNumber,
    required this.buildingWing,
    this.isAtHome = true,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'phoneNumber': phoneNumber,
        'flatNumber': flatNumber,
        'buildingWing': buildingWing,
        'isAtHome': isAtHome,
      };

  factory Resident.fromJson(Map<String, dynamic> json) => Resident(
        id: json['id'] as String,
        name: json['name'] as String,
        phoneNumber: json['phoneNumber'] as String,
        flatNumber: json['flatNumber'] as String,
        buildingWing: json['buildingWing'] as String,
        isAtHome: json['isAtHome'] as bool? ?? true,
      );
}
