class SocietyServiceModel {
  final String id;
  final String societyId;
  final String name;
  final String category;
  final String serviceType; // VENDOR, UTILITY, STAFF
  final String? providerName;
  final String phone;
  final String? alternatePhone;
  final String? address;
  final String? description;
  final double rating;
  final int reviewCount;
  final bool isVerified;
  final String? timing;

  const SocietyServiceModel({
    required this.id,
    required this.societyId,
    required this.name,
    required this.category,
    required this.serviceType,
    this.providerName,
    required this.phone,
    this.alternatePhone,
    this.address,
    this.description,
    this.rating = 4.5,
    this.reviewCount = 0,
    this.isVerified = true,
    this.timing,
  });

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return 'S';
    if (parts.length == 1) return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  factory SocietyServiceModel.fromJson(Map<String, dynamic> json) {
    return SocietyServiceModel(
      id: json['id']?.toString() ?? '',
      societyId: json['societyId']?.toString() ?? json['society_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? 'General',
      serviceType: json['serviceType']?.toString() ?? json['service_type']?.toString() ?? 'VENDOR',
      providerName: json['providerName']?.toString() ?? json['provider_name']?.toString(),
      phone: json['phone']?.toString() ?? '',
      alternatePhone: json['alternatePhone']?.toString() ?? json['alternate_phone']?.toString(),
      address: json['address']?.toString(),
      description: json['description']?.toString(),
      rating: (json['rating'] != null) ? double.tryParse(json['rating'].toString()) ?? 4.5 : 4.5,
      reviewCount: (json['reviewCount'] != null) ? int.tryParse(json['reviewCount'].toString()) ?? 0 : (json['review_count'] != null ? int.tryParse(json['review_count'].toString()) ?? 0 : 0),
      isVerified: json['isVerified'] == true || json['is_verified'] == 1 || json['is_verified'] == true,
      timing: json['timing']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'societyId': societyId,
    'name': name,
    'category': category,
    'serviceType': serviceType,
    'providerName': providerName,
    'phone': phone,
    'alternatePhone': alternatePhone,
    'address': address,
    'description': description,
    'rating': rating,
    'reviewCount': reviewCount,
    'isVerified': isVerified,
    'timing': timing,
  };
}

