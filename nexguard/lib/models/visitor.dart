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
  final String? thumbPath; // 200x200 thumbnail for fast list rendering
  final VisitorType type;
  final String? deliveryCompany;
  final String? vehicleNumber;

  const Visitor({
    required this.name,
    this.phoneNumber,
    this.photoPath,
    this.thumbPath,
    required this.type,
    this.deliveryCompany,
    this.vehicleNumber,
  });

  /// Returns 200x200 thumb if available, falls back reliably to full photo
  String? get displayPhoto {
    // 1. If thumbPath is already a valid full URL
    if (thumbPath != null && (thumbPath!.startsWith('http://') || thumbPath!.startsWith('https://'))) {
      return thumbPath;
    }
    // 2. If photoPath is Cloudinary, transform into instant 200x200 CDN thumbnail
    if (photoPath != null && photoPath!.contains('cloudinary.com') && photoPath!.contains('/image/upload/')) {
      return photoPath!.replaceFirst('/image/upload/', '/image/upload/c_fill,h_200,w_200,q_70/');
    }
    // 3. If photoPath is a full URL, use it
    if (photoPath != null && (photoPath!.startsWith('http://') || photoPath!.startsWith('https://'))) {
      return photoPath;
    }
    // 4. Local camera file on device
    if (photoPath != null && photoPath!.isNotEmpty) {
      return photoPath;
    }
    return thumbPath;
  }

  Visitor copyWith({
    String? name,
    String? phoneNumber,
    String? photoPath,
    String? thumbPath,
    VisitorType? type,
    String? deliveryCompany,
    String? vehicleNumber,
  }) {
    return Visitor(
      name: name ?? this.name,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      photoPath: photoPath ?? this.photoPath,
      thumbPath: thumbPath ?? this.thumbPath,
      type: type ?? this.type,
      deliveryCompany: deliveryCompany ?? this.deliveryCompany,
      vehicleNumber: vehicleNumber ?? this.vehicleNumber,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'phoneNumber': phoneNumber,
        'photoPath': photoPath,
        'thumbPath': thumbPath,
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
        thumbPath: (json['thumbPath'] ?? json['thumbUrl'])?.toString(),
        type: VisitorType.fromString(
            (json['type'] ?? json['visitorType'])?.toString()),
        deliveryCompany:
            (json['deliveryCompany'] ?? json['company'])?.toString(),
        vehicleNumber: (json['vehicleNumber'] ?? json['vehicle'])?.toString(),
      );
}