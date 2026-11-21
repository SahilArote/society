/// Model for Pre-Approved Visitor Entry Passes (Invitations).
class InviteModel {
  final String id;
  final String passCode;
  final String visitorName;
  final String? visitorPhone;
  final String purpose;
  final DateTime validFrom;
  final DateTime validUntil;
  final String? notes;
  final String status; // ACTIVE, USED, EXPIRED, CANCELLED
  final DateTime? usedAt;
  final DateTime createdAt;
  final String flatNumber;
  final String wing;
  final String residentName;

  const InviteModel({
    required this.id,
    required this.passCode,
    required this.visitorName,
    this.visitorPhone,
    this.purpose = 'guest',
    required this.validFrom,
    required this.validUntil,
    this.notes,
    this.status = 'ACTIVE',
    this.usedAt,
    required this.createdAt,
    this.flatNumber = '',
    this.wing = '',
    this.residentName = '',
  });

  bool get isActive => status.toUpperCase() == 'ACTIVE' && validUntil.isAfter(DateTime.now());
  bool get isUsed => status.toUpperCase() == 'USED';
  bool get isExpired => status.toUpperCase() == 'EXPIRED' || (status.toUpperCase() == 'ACTIVE' && validUntil.isBefore(DateTime.now()));
  bool get isCancelled => status.toUpperCase() == 'CANCELLED';

  factory InviteModel.fromJson(Map<String, dynamic> json) {
    return InviteModel(
      id: json['id']?.toString() ?? '',
      passCode: json['passCode']?.toString() ?? json['pass_code']?.toString() ?? '',
      visitorName: json['visitorName']?.toString() ?? json['visitor_name']?.toString() ?? '',
      visitorPhone: json['visitorPhone']?.toString() ?? json['visitor_phone']?.toString(),
      purpose: json['purpose']?.toString().toLowerCase() ?? 'guest',
      validFrom: json['validFrom'] != null
          ? (DateTime.tryParse(json['validFrom'].toString()) ?? DateTime.now())
          : (DateTime.tryParse(json['valid_from']?.toString() ?? '') ?? DateTime.now()),
      validUntil: json['validUntil'] != null
          ? (DateTime.tryParse(json['validUntil'].toString()) ?? DateTime.now().add(const Duration(days: 1)))
          : (DateTime.tryParse(json['valid_until']?.toString() ?? '') ?? DateTime.now().add(const Duration(days: 1))),
      notes: json['notes']?.toString(),
      status: json['status']?.toString().toUpperCase() ?? 'ACTIVE',
      usedAt: json['usedAt'] != null
          ? DateTime.tryParse(json['usedAt'].toString())
          : (json['used_at'] != null ? DateTime.tryParse(json['used_at'].toString()) : null),
      createdAt: json['createdAt'] != null
          ? (DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now())
          : (DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now()),
      flatNumber: json['flatNumber']?.toString() ?? '',
      wing: json['wing']?.toString() ?? '',
      residentName: json['residentName']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'passCode': passCode,
      'visitorName': visitorName,
      'visitorPhone': visitorPhone,
      'purpose': purpose,
      'validFrom': validFrom.toIso8601String(),
      'validUntil': validUntil.toIso8601String(),
      'notes': notes,
      'status': status,
      'usedAt': usedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'flatNumber': flatNumber,
      'wing': wing,
      'residentName': residentName,
    };
  }
}

