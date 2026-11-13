enum VisitorType {
  guest,
  delivery,
  maintenance,
  cab,
  other;

  String get displayName {
    switch (this) {
      case VisitorType.guest:
        return 'Guest';
      case VisitorType.delivery:
        return 'Delivery';
      case VisitorType.maintenance:
        return 'Maintenance';
      case VisitorType.cab:
        return 'Cab/Auto';
      case VisitorType.other:
        return 'Other';
    }
  }

  static VisitorType fromString(String? val) {
    if (val == null || val.isEmpty) return VisitorType.guest;
    final lower = val.toLowerCase().trim();
    if (lower.contains('cab') ||
        lower.contains('auto') ||
        lower.contains('taxi')) {
      return VisitorType.cab;
    }
    if (lower.contains('deliv') ||
        lower.contains('courier') ||
        lower.contains('package')) {
      return VisitorType.delivery;
    }
    if (lower.contains('maint') ||
        lower.contains('service') ||
        lower.contains('repair') ||
        lower.contains('worker')) {
      return VisitorType.maintenance;
    }
    for (final e in VisitorType.values) {
      if (e.name == lower) return e;
    }
    return VisitorType.guest;
  }
}

class Visitor {
  final String name;
  final String? phoneNumber;
  final String? photoPath;
  final VisitorType type;
  final String? deliveryCompany;
  final String? vehicleNumber;

  const Visitor({
    required this.name,
    this.phoneNumber,
    this.photoPath,
    required this.type,
    this.deliveryCompany,
    this.vehicleNumber,
  });

  Visitor copyWith({
    String? name,
    String? phoneNumber,
    String? photoPath,
    VisitorType? type,
    String? deliveryCompany,
    String? vehicleNumber,
  }) {
    return Visitor(
      name: name ?? this.name,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      photoPath: photoPath ?? this.photoPath,
      type: type ?? this.type,
      deliveryCompany: deliveryCompany ?? this.deliveryCompany,
      vehicleNumber: vehicleNumber ?? this.vehicleNumber,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'phoneNumber': phoneNumber,
        'photoPath': photoPath,
        'type': type.name,
        'deliveryCompany': deliveryCompany,
        'vehicleNumber': vehicleNumber,
      };

  factory Visitor.fromJson(Map<String, dynamic> json) => Visitor(
        name: (json['name'] ?? 'Visitor').toString(),
        phoneNumber: (json['phoneNumber'] ?? json['mobile'] ?? json['phone'])
            ?.toString(),
        photoPath: (json['photoPath'] ?? json['photoUrl'] ?? json['photo'])
            ?.toString(),
        type: VisitorType.fromString(
            (json['type'] ?? json['visitorType'])?.toString()),
        deliveryCompany:
            (json['deliveryCompany'] ?? json['company'])?.toString(),
        vehicleNumber: (json['vehicleNumber'] ?? json['vehicle'])?.toString(),
      );
}