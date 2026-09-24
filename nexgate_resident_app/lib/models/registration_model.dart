/// Models for society flats hierarchy and resident registration flow.
class FlatUnit {
  final String id;
  final String flatNumber;
  final String wing;
  final int floor;
  final bool isOccupied;

  const FlatUnit({
    required this.id,
    required this.flatNumber,
    required this.wing,
    required this.floor,
    this.isOccupied = false,
  });

  factory FlatUnit.fromJson(Map<String, dynamic> json) {
    return FlatUnit(
      id: json['id']?.toString() ?? '',
      flatNumber: json['flatNumber']?.toString() ?? '',
      wing: json['wing']?.toString() ?? '',
      floor: int.tryParse(json['floor']?.toString() ?? '1') ?? 1,
      isOccupied: json['isOccupied'] == true || json['isOccupied'] == 1,
    );
  }
}

class FlatsHierarchy {
  final List<String> wings;
  final Map<String, List<int>> floors;
  final List<FlatUnit> flats;

  const FlatsHierarchy({
    required this.wings,
    required this.floors,
    required this.flats,
  });

  factory FlatsHierarchy.fromJson(Map<String, dynamic> json) {
    final wingsList = (json['wings'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [];

    final floorsMap = <String, List<int>>{};
    if (json['floors'] is Map<String, dynamic>) {
      (json['floors'] as Map<String, dynamic>).forEach((k, v) {
        if (v is List) {
          floorsMap[k] = v.map((f) => int.tryParse(f.toString()) ?? 1).toList();
        }
      });
    }

    final flatsList = (json['flats'] as List<dynamic>?)
            ?.map((f) => FlatUnit.fromJson(f as Map<String, dynamic>))
            .toList() ??
        [];

    return FlatsHierarchy(
      wings: wingsList,
      floors: floorsMap,
      flats: flatsList,
    );
  }
}

class RegistrationStatusData {
  final String status; // PENDING, APPROVED, REJECTED, NOT_REGISTERED
  final bool isRegistered;
  final String? requestId;
  final String? wing;
  final int? floor;
  final String? flatNumber;
  final String? rejectionReason;
  final DateTime? createdAt;

  const RegistrationStatusData({
    required this.status,
    this.isRegistered = false,
    this.requestId,
    this.wing,
    this.floor,
    this.flatNumber,
    this.rejectionReason,
    this.createdAt,
  });

  factory RegistrationStatusData.fromJson(Map<String, dynamic> json) {
    final req = json['request'] as Map<String, dynamic>?;
    return RegistrationStatusData(
      status: (json['status'] ?? 'NOT_REGISTERED').toString().toUpperCase(),
      isRegistered: json['isRegistered'] == true,
      requestId: req?['id']?.toString() ?? json['id']?.toString(),
      wing: req?['wing']?.toString() ?? json['wing']?.toString(),
      floor: req?['floor'] != null ? int.tryParse(req!['floor'].toString()) : null,
      flatNumber: req?['flatNumber']?.toString() ?? json['flatNumber']?.toString(),
      rejectionReason: req?['rejectionReason']?.toString() ?? json['rejectionReason']?.toString(),
      createdAt: req?['createdAt'] != null ? DateTime.tryParse(req!['createdAt'].toString()) : null,
    );
  }
}
