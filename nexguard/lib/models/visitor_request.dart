import 'visitor.dart';

enum VisitorStatus {
  pending,
  approved,
  rejected,
  completed,
  exited;

  String get displayName {
    switch (this) {
      case VisitorStatus.pending:
        return 'Pending';
      case VisitorStatus.approved:
        return 'Approved';
      case VisitorStatus.rejected:
        return 'Rejected';
      case VisitorStatus.completed:
        return 'Entered';
      case VisitorStatus.exited:
        return 'Exited';
    }
  }

  static VisitorStatus fromString(String? val) {
    if (val == null || val.isEmpty) return VisitorStatus.pending;
    final lower = val.toLowerCase().trim();
    if (lower == 'approved') return VisitorStatus.approved;
    if (lower == 'rejected') return VisitorStatus.rejected;
    if (lower == 'completed' || lower == 'entered') return VisitorStatus.completed;
    if (lower == 'exited' || lower == 'checked_out') return VisitorStatus.exited;
    return VisitorStatus.pending;
  }
}

class VisitorRequest {
  final String id;
  final Visitor visitor;
  final String flatNumber;
  final String buildingWing;
  final String residentName;
  final String residentPhone;
  final String purpose;
  VisitorStatus status;
  final DateTime requestTime;
  DateTime? decisionTime;
  DateTime? exitTime;
  String? decisionBy;
  String? rejectionReason;

  VisitorRequest({
    required this.id,
    required this.visitor,
    required this.flatNumber,
    required this.buildingWing,
    required this.residentName,
    required this.residentPhone,
    required this.purpose,
    this.status = VisitorStatus.pending,
    required this.requestTime,
    this.decisionTime,
    this.exitTime,
    this.decisionBy,
    this.rejectionReason,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'visitor': visitor.toJson(),
        'flatNumber': flatNumber,
        'buildingWing': buildingWing,
        'residentName': residentName,
        'residentPhone': residentPhone,
        'purpose': purpose,
        'status': status.name,
        'requestTime': requestTime.toIso8601String(),
        'decisionTime': decisionTime?.toIso8601String(),
        'exitTime': exitTime?.toIso8601String(),
        'decisionBy': decisionBy,
        'rejectionReason': rejectionReason,
      };

  factory VisitorRequest.fromJson(Map<String, dynamic> json) {
    final visitorData = json['visitor'];
    final Map<String, dynamic> visitorMap;
    if (visitorData is Map<String, dynamic>) {
      visitorMap = visitorData;
    } else if (visitorData is Map) {
      visitorMap = Map<String, dynamic>.from(visitorData);
    } else {
      visitorMap = <String, dynamic>{
        'name': json['visitorName'] ?? json['name'] ?? 'Visitor',
        'mobile':
            json['visitorMobile'] ?? json['mobile'] ?? json['phoneNumber'],
        'photoUrl': json['photoUrl'] ?? json['photoPath'],
        'visitorType': json['visitorType'] ?? json['type'],
        'vehicleNumber': json['vehicleNumber'],
        'deliveryCompany': json['deliveryCompany'],
      };
    }

    final purpose =
        (json['purpose'] ?? visitorMap['purpose'] ?? 'Visit').toString();

    return VisitorRequest(
      id: (json['id'] ?? '').toString(),
      visitor: Visitor.fromJson(visitorMap),
      flatNumber: (json['flatNumber'] ?? '').toString(),
      buildingWing: (json['buildingWing'] ?? '').toString(),
      residentName: (json['residentName'] ?? '').toString(),
      residentPhone:
          (json['residentPhone'] ?? json['residentMobile'] ?? '').toString(),
      purpose: purpose,
      status: VisitorStatus.fromString(json['status']?.toString()),
      requestTime: (json['requestTime'] != null
              ? DateTime.tryParse(json['requestTime'].toString())?.toLocal()
              : (json['requestedAt'] != null
                  ? DateTime.tryParse(json['requestedAt'].toString())?.toLocal()
                  : null)) ??
          DateTime.now(),
      decisionTime: json['decisionTime'] != null
          ? DateTime.tryParse(json['decisionTime'].toString())?.toLocal()
          : (json['respondedAt'] != null
              ? DateTime.tryParse(json['respondedAt'].toString())?.toLocal()
              : null),
      exitTime: json['exitTime'] != null
          ? DateTime.tryParse(json['exitTime'].toString())?.toLocal()
          : null,
      decisionBy: (json['decisionBy'] ?? json['responseBy'])?.toString(),
      rejectionReason: (json['rejectionReason'] ?? json['reason'])?.toString(),
    );
  }

  VisitorRequest copyWith({
    String? id,
    Visitor? visitor,
    String? flatNumber,
    String? buildingWing,
    String? residentName,
    String? residentPhone,
    String? purpose,
    VisitorStatus? status,
    DateTime? requestTime,
    DateTime? decisionTime,
    DateTime? exitTime,
    String? decisionBy,
    String? rejectionReason,
  }) {
    return VisitorRequest(
      id: id ?? this.id,
      visitor: visitor ?? this.visitor,
      flatNumber: flatNumber ?? this.flatNumber,
      buildingWing: buildingWing ?? this.buildingWing,
      residentName: residentName ?? this.residentName,
      residentPhone: residentPhone ?? this.residentPhone,
      purpose: purpose ?? this.purpose,
      status: status ?? this.status,
      requestTime: requestTime ?? this.requestTime,
      decisionTime: decisionTime ?? this.decisionTime,
      exitTime: exitTime ?? this.exitTime,
      decisionBy: decisionBy ?? this.decisionBy,
      rejectionReason: rejectionReason ?? this.rejectionReason,
    );
  }
}
