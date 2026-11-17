class BreakdownItemModel {
  final String title;
  final double amount;

  const BreakdownItemModel({
    required this.title,
    required this.amount,
  });

  factory BreakdownItemModel.fromJson(Map<String, dynamic> json) {
    return BreakdownItemModel(
      title: json['title']?.toString() ?? 'Charge',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
    );
  }
}

class MaintenanceBillModel {
  final String invoiceId;
  final String invoiceNumber;
  final String flatId;
  final String flatNumber;
  final String wing;
  final String societyName;
  final String billingPeriod;
  final String dueDate;
  final double totalAmount;
  final double paidAmount;
  final String status; // 'UNPAID' | 'PENDING_CHECK' | 'PAID' | 'CANCELLED'
  final List<BreakdownItemModel> breakdown;
  final String referenceId;
  final String merchantVpa;
  final String merchantName;
  /// true = admin has configured a real registered UPI VPA — safe to show payment buttons
  final bool upiReady;
  /// Pre-built UPI URI from server (reference only). App always rebuilds fresh on payment attempt.
  final String upiUri;
  final String? submittedUtr;
  final String? submittedAt;
  final String? receiptNumber;
  final String? paidAt;

  const MaintenanceBillModel({
    required this.invoiceId,
    required this.invoiceNumber,
    required this.flatId,
    required this.flatNumber,
    required this.wing,
    required this.societyName,
    required this.billingPeriod,
    required this.dueDate,
    required this.totalAmount,
    required this.paidAmount,
    required this.status,
    required this.breakdown,
    required this.referenceId,
    required this.merchantVpa,
    required this.merchantName,
    required this.upiReady,
    required this.upiUri,
    this.submittedUtr,
    this.submittedAt,
    this.receiptNumber,
    this.paidAt,
  });

  bool get isPaid => status.toUpperCase() == 'PAID';
  bool get isPendingCheck => status.toUpperCase() == 'PENDING_CHECK';
  bool get isUnpaid => status.toUpperCase() == 'UNPAID';

  factory MaintenanceBillModel.fromJson(Map<String, dynamic> json) {
    final breakdownList = <BreakdownItemModel>[];
    if (json['breakdown'] is List) {
      for (final item in (json['breakdown'] as List)) {
        if (item is Map<String, dynamic>) {
          breakdownList.add(BreakdownItemModel.fromJson(item));
        }
      }
    }

    return MaintenanceBillModel(
      invoiceId: json['invoiceId']?.toString() ?? '',
      invoiceNumber: json['invoiceNumber']?.toString() ?? 'INV-001',
      flatId: json['flatId']?.toString() ?? '',
      flatNumber: json['flatNumber']?.toString() ?? 'A-101',
      wing: json['wing']?.toString() ?? '',
      societyName: json['societyName']?.toString() ?? 'Green Valley CHS',
      billingPeriod: json['billingPeriod']?.toString() ?? '',
      dueDate: json['dueDate']?.toString() ?? '',
      totalAmount: double.tryParse(json['totalAmount']?.toString() ?? '0') ?? 2500.0,
      paidAmount: double.tryParse(json['paidAmount']?.toString() ?? '0') ?? 0.0,
      status: json['status']?.toString() ?? 'UNPAID',
      breakdown: breakdownList.isNotEmpty
          ? breakdownList
          : [
              const BreakdownItemModel(title: 'Maintenance', amount: 2000),
              const BreakdownItemModel(title: 'Sinking fund', amount: 300),
              const BreakdownItemModel(title: 'Parking', amount: 200),
            ],
      referenceId: json['referenceId']?.toString() ?? '',
      merchantVpa: json['merchantVpa']?.toString() ?? '',
      merchantName: json['merchantName']?.toString() ?? '',
      upiReady: json['upiReady'] == true,
      upiUri: json['upiUri']?.toString() ?? '',
      submittedUtr: json['submittedUtr']?.toString(),
      submittedAt: json['submittedAt']?.toString(),
      receiptNumber: json['receiptNumber']?.toString(),
      paidAt: json['paidAt']?.toString(),
    );
  }
}

