import 'visitor.dart';

enum VisitorStatus {
  pending,
  approved,
  rejected,
  completed;

  String get displayName {
    switch (this) {
      case VisitorStatus.pending:
        return 'Pending';
      case VisitorStatus.approved:
        return 'Approved';
      case VisitorStatus.rejected:
        return 'Rejected';
      case VisitorStatus.completed:
        return 'Completed';
    }
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
        'decisionBy': decisionBy,
        'rejectionReason': rejectionReason,
      };

  factory VisitorRequest.fromJson(Map<String, dynamic> json) => VisitorRequest(
        id: json['id'] as String,
        visitor: Visitor.fromJson(json['visitor'] as Map<String, dynamic>),
        flatNumber: json['flatNumber'] as String,
        buildingWing: json['buildingWing'] as String,
        residentName: json['residentName'] as String,
        residentPhone: json['residentPhone'] as String,
        purpose: json['purpose'] as String,
        status: VisitorStatus.values.firstWhere(
          (e) => e.name == json['status'] || (json['status'] == 'entered' && e == VisitorStatus.completed),
          orElse: () => VisitorStatus.pending,
        ),
        requestTime: DateTime.parse(json['requestTime'] as String),
        decisionTime: json['decisionTime'] != null
            ? DateTime.parse(json['decisionTime'] as String)
            : null,
        decisionBy: json['decisionBy'] as String?,
        rejectionReason: json['rejectionReason'] as String?,
      );
}
