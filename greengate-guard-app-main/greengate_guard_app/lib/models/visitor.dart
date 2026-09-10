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

  Map<String, dynamic> toJson() => {
        'name': name,
        'phoneNumber': phoneNumber,
        'photoPath': photoPath,
        'type': type.name,
        'deliveryCompany': deliveryCompany,
        'vehicleNumber': vehicleNumber,
      };

  factory Visitor.fromJson(Map<String, dynamic> json) => Visitor(
        name: json['name'] as String,
        phoneNumber: json['phoneNumber'] as String?,
        photoPath: json['photoPath'] as String?,
        type: VisitorType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => VisitorType.guest,
        ),
        deliveryCompany: json['deliveryCompany'] as String?,
        vehicleNumber: json['vehicleNumber'] as String?,
      );
}
