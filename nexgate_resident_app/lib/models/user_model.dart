/// Resident User Model representing verified JWT identity.
class UserModel {
  final String id;
  final String name;
  final String mobile;
  final String role;
  final String societyId;
  final String flatId;
  final String flatNumber;
  final String wing;
  final String societyName;

  const UserModel({
    required this.id,
    required this.name,
    required this.mobile,
    this.role = 'RESIDENT',
    required this.societyId,
    required this.flatId,
    required this.flatNumber,
    required this.wing,
    this.societyName = 'Eco Residency Co-operative Housing Society Ltd',
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Resident',
      mobile: json['mobile']?.toString() ?? '',
      role: json['role']?.toString() ?? 'RESIDENT',
      societyId: json['societyId']?.toString() ?? '',
      flatId: json['flatId']?.toString() ?? '',
      flatNumber: json['flatNumber']?.toString() ?? 'Unit',
      wing: json['wing']?.toString() ?? json['buildingWing']?.toString() ?? '',
      societyName: json['societyName']?.toString() ?? 'Eco Residency Co-operative Housing Society Ltd',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'mobile': mobile,
      'role': role,
      'societyId': societyId,
      'flatId': flatId,
      'flatNumber': flatNumber,
      'wing': wing,
      'societyName': societyName,
    };
  }

  UserModel copyWith({
    String? id,
    String? name,
    String? mobile,
    String? role,
    String? societyId,
    String? flatId,
    String? flatNumber,
    String? wing,
    String? societyName,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      mobile: mobile ?? this.mobile,
      role: role ?? this.role,
      societyId: societyId ?? this.societyId,
      flatId: flatId ?? this.flatId,
      flatNumber: flatNumber ?? this.flatNumber,
      wing: wing ?? this.wing,
      societyName: societyName ?? this.societyName,
    );
  }

  String get formattedFlat => wing.isNotEmpty ? 'Wing $wing - Flat $flatNumber' : 'Flat $flatNumber';
}
