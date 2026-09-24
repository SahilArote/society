/// Model for household family members.
class FamilyMemberModel {
  final String id;
  final String name;
  final String relationship;
  final String? phone;
  final String? flatId;

  const FamilyMemberModel({
    required this.id,
    required this.name,
    required this.relationship,
    this.phone,
    this.flatId,
  });

  factory FamilyMemberModel.fromJson(Map<String, dynamic> json) {
    return FamilyMemberModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      relationship: json['relationship']?.toString() ?? 'Family',
      phone: json['phone']?.toString(),
      flatId: json['flatId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'relationship': relationship,
      if (phone != null) 'phone': phone,
    };
  }
}
