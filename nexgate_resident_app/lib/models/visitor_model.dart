/// Visitor Model matching the backend visitor requests table.
class VisitorModel {
  final String id;
  final String name;
  final String? phone;
  final String purpose;
  final String visitorType;
  final String status; // PENDING, APPROVED, REJECTED, ENTERED, EXITED
  final String? photoUrl;
  final String gate;
  final String flatNumber;
  final String? buildingWing;
  final String? vehicleNumber;
  final String? deliveryCompany;
  final String? notes;
  final DateTime requestedAt;
  final DateTime? respondedAt;
  final String? responseBy;
  final String? rejectionReason;
  final bool isPreApproved;

  const VisitorModel({
    required this.id,
    required this.name,
    this.phone,
    this.purpose = 'guest',
    this.visitorType = 'guest',
    this.status = 'PENDING',
    this.photoUrl,
    this.gate = 'Main Gate',
    this.flatNumber = '',
    this.buildingWing,
    this.vehicleNumber,
    this.deliveryCompany,
    this.notes,
    required this.requestedAt,
    this.respondedAt,
    this.responseBy,
    this.rejectionReason,
    this.isPreApproved = false,
  });

  bool get isPending => status.toUpperCase() == 'PENDING';
  bool get isApproved => status.toUpperCase() == 'APPROVED';
  bool get isRejected => status.toUpperCase() == 'REJECTED';
  bool get isEntered => status.toUpperCase() == 'ENTERED' || status.toUpperCase() == 'INSIDE';
  bool get isExited => status.toUpperCase() == 'EXITED' || status.toUpperCase() == 'LEFT';

  factory VisitorModel.fromJson(Map<String, dynamic> json) {
    final v = json['visitor'] is Map<String, dynamic> ? json['visitor'] : json;

    final rawPhoto = v['photoUrl'] ?? v['photo'] ?? json['photoUrl'] ?? json['photo'];
    final rawRequestedAt = json['requestedAt'] ?? v['requestedAt'];
    final rawRespondedAt = json['respondedAt'] ?? v['respondedAt'];

    return VisitorModel(
      id: json['id']?.toString() ?? '',
      name: v['name']?.toString() ?? json['name']?.toString() ?? 'Visitor',
      phone: v['mobile']?.toString() ?? v['phone']?.toString() ?? json['phone']?.toString(),
      purpose: (v['purpose'] ?? json['purpose'] ?? json['entryType'] ?? 'guest').toString(),
      visitorType: (v['visitorType'] ?? json['visitorType'] ?? 'guest').toString(),
      status: (json['status'] ?? 'PENDING').toString().toUpperCase(),
      photoUrl: rawPhoto?.toString(),
      gate: json['gateName']?.toString() ?? json['gate']?.toString() ?? 'Main Gate',
      flatNumber: json['flatNumber']?.toString() ?? '',
      buildingWing: json['buildingWing']?.toString(),
      vehicleNumber: v['vehicleNumber']?.toString() ?? json['vehicleNumber']?.toString(),
      deliveryCompany: v['deliveryCompany']?.toString() ?? json['deliveryCompany']?.toString(),
      notes: json['notes']?.toString() ?? v['notes']?.toString(),
      requestedAt: rawRequestedAt != null
          ? DateTime.tryParse(rawRequestedAt.toString()) ?? DateTime.now()
          : DateTime.now(),
      respondedAt: rawRespondedAt != null
          ? DateTime.tryParse(rawRespondedAt.toString())
          : null,
      responseBy: json['responseBy']?.toString(),
      rejectionReason: json['rejectionReason']?.toString(),
      isPreApproved: json['isPreApproved'] == true || json['isPreApproved'] == 1,
    );
  }

  VisitorModel copyWith({
    String? id,
    String? name,
    String? phone,
    String? purpose,
    String? visitorType,
    String? status,
    String? photoUrl,
    String? gate,
    String? flatNumber,
    String? buildingWing,
    String? vehicleNumber,
    String? deliveryCompany,
    String? notes,
    DateTime? requestedAt,
    DateTime? respondedAt,
    String? responseBy,
    String? rejectionReason,
    bool? isPreApproved,
  }) {
    return VisitorModel(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      purpose: purpose ?? this.purpose,
      visitorType: visitorType ?? this.visitorType,
      status: status ?? this.status,
      photoUrl: photoUrl ?? this.photoUrl,
      gate: gate ?? this.gate,
      flatNumber: flatNumber ?? this.flatNumber,
      buildingWing: buildingWing ?? this.buildingWing,
      vehicleNumber: vehicleNumber ?? this.vehicleNumber,
      deliveryCompany: deliveryCompany ?? this.deliveryCompany,
      notes: notes ?? this.notes,
      requestedAt: requestedAt ?? this.requestedAt,
      respondedAt: respondedAt ?? this.respondedAt,
      responseBy: responseBy ?? this.responseBy,
      rejectionReason: rejectionReason ?? this.rejectionReason,
      isPreApproved: isPreApproved ?? this.isPreApproved,
    );
  }
}
