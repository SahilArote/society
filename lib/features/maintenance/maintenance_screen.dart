import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/haptic_helper.dart';
import '../../models/maintenance_model.dart';
import '../../services/api_service.dart';

// ============================================================================
// SOCIETYOS / REFFER DESIGN TOKENS (PropTech Premium Palette)
// ============================================================================
class RefferTheme {
  static const Color navy = Color(0xFF0D2137);
  static const Color navy900 = Color(0xFF091829);
  static const Color navy700 = Color(0xFF143155);
  static const Color amber = Color(0xFFE8A020);
  static const Color amberLight = Color(0xFFFBF0DC);
  static const Color surface = Color(0xFFFAF8F5);
  static const Color surface2 = Color(0xFFF2EFE9);
  static const Color cardBg = Colors.white;
  static const Color border = Color(0xFFE5DED3);
  static const Color green = Color(0xFF16A34A);
  static const Color greenLight = Color(0xFFDCFCE7);
  static const Color textPrimary = Color(0xFF0D2137);
  static const Color textMuted = Color(0xFF64748B);
  static const Color textSecondary = Color(0xFF374151);
}

enum MaintenanceStep {
  summary,
  method,
  confirmUtr,
  receipt,
}

class MaintenanceScreen extends StatefulWidget {
  const MaintenanceScreen({super.key});

  @override
  State<MaintenanceScreen> createState() => _MaintenanceScreenState();
}

class _MaintenanceScreenState extends State<MaintenanceScreen> {
  MaintenanceStep _currentStep = MaintenanceStep.summary;
  MaintenanceBillModel? _bill;
  bool _isLoading = true;
  String? _errorMessage;
  List<MaintenanceHistoryItemModel> _history = [];

  // Step 2 & 3 state
  String _selectedPaymentType = 'upi'; // 'upi' | 'qr' | 'bank'
  final TextEditingController _utrController = TextEditingController();
  File? _screenshotFile;
  bool _isSubmitting = false;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadBill();
  }

  @override
  void dispose() {
    _utrController.dispose();
    super.dispose();
  }

  Future<void> _loadBill({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final results = await Future.wait([
        ApiService.fetchCurrentMaintenanceBill(),
        ApiService.fetchMaintenanceHistory(),
      ]);
      if (!mounted) return;

      final bill = results[0] as MaintenanceBillModel;
      final history = results[1] as List<MaintenanceHistoryItemModel>;

      setState(() {
        _bill = bill;
        _history = history;
        _isLoading = false;

        // Auto-navigate to receipt step if bill is paid or submitted for check
        if (bill.isPaid || bill.isPendingCheck) {
          _currentStep = MaintenanceStep.receipt;
          if (bill.submittedUtr != null && _utrController.text.isEmpty) {
            _utrController.text = bill.submittedUtr!;
          }
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  String _formatINR(double amount) {
    return '₹${amount.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d+?)(?=(\d\d)+(\d)(?!\d))'),
          (Match m) => '${m[1]},',
        )}';
  }

  /// Build NPCI-compliant UPI Intent URI
  String _buildUpiUri() {
    final bill = _bill!;
    final amount = bill.totalAmount.toStringAsFixed(2);
    final encodedName = Uri.encodeComponent(bill.merchantName);
    final noteRaw = '${bill.flatNumber} ${bill.billingPeriod} Maintenance';
    final encodedNote = Uri.encodeComponent(noteRaw.length > 50 ? noteRaw.substring(0, 50) : noteRaw);
    final safeRef = bill.referenceId.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
    return 'upi://pay?pa=${bill.merchantVpa}&pn=$encodedName&am=$amount&cu=INR&tn=$encodedNote&tr=$safeRef';
  }

  /// Launch NPCI UPI Intent URI into user's installed banking/UPI app
  Future<void> _launchUpiIntent({String? package}) async {
    if (_bill == null) return;
    HapticHelper.mediumImpact();

    final vpa = _bill!.merchantVpa.trim();
    if (vpa.isEmpty || !vpa.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Society has not configured merchant UPI yet. Please use Bank Transfer or contact the society office.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final baseUri = _buildUpiUri();
    bool launched = false;

    try {
      final uri = Uri.parse(baseUri);
      launched = await launchUrl(uri, mode: LaunchMode.externalNonBrowserApplication);
    } catch (_) {
      try {
        launched = await launchUrl(Uri.parse(baseUri), mode: LaunchMode.externalApplication);
      } catch (_) {
        launched = false;
      }
    }

    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not open UPI app. Please ensure Google Pay or a UPI app is installed on your phone.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showPaymentConfirmationSheet(String appName) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 18),
              Container(
                width: 56,
                height: 56,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Image.asset(
                  'assets/images/gpay.png',
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Icon(
                    Icons.account_balance_wallet_rounded,
                    color: Color(0xFF4285F4),
                    size: 30,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Opened Google Pay',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: RefferTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Did you complete the payment of ${_formatINR(_bill!.totalAmount)} in Google Pay?',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: RefferTheme.textMuted),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    HapticHelper.mediumImpact();
                    setState(() {
                      _currentStep = MaintenanceStep.confirmUtr;
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RefferTheme.navy,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Yes, I Paid (Enter 12-Digit UTR)',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: RefferTheme.border),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text(
                    'Didn\'t Pay Yet / Try Again',
                    style: TextStyle(
                      fontSize: 14,
                      color: RefferTheme.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickScreenshot() async {
    HapticHelper.selectionClick();
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
        maxWidth: 1200,
      );
      if (image != null && mounted) {
        setState(() => _screenshotFile = File(image.path));
      }
    } catch (e) {
      debugPrint('[Screenshot] Pick error: $e');
    }
  }

  Future<void> _submitUtr() async {
    final utr = _utrController.text.trim();
    if (utr.isEmpty || utr.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 12-digit UPI UTR reference number')),
      );
      return;
    }

    if (_bill == null) return;
    HapticHelper.mediumImpact();
    setState(() => _isSubmitting = true);

    try {
      await ApiService.submitMaintenancePayment(
        invoiceId: _bill!.invoiceId,
        utr: utr,
        screenshotFilePath: _screenshotFile?.path,
      );

      if (!mounted) return;
      HapticHelper.success();
      await _loadBill(silent: true);
      setState(() {
        _isSubmitting = false;
        _currentStep = MaintenanceStep.receipt;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: RefferTheme.surface,
      appBar: AppBar(
        title: Text(
          _currentStep == MaintenanceStep.method
              ? 'Choose Payment Method'
              : _currentStep == MaintenanceStep.confirmUtr
                  ? 'Confirm Payment'
                  : 'Maintenance Dues',
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: RefferTheme.textPrimary,
          ),
        ),
        backgroundColor: RefferTheme.surface,
        elevation: 0,
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: RefferTheme.textPrimary),
          onPressed: () {
            if (_currentStep == MaintenanceStep.confirmUtr) {
              setState(() => _currentStep = MaintenanceStep.method);
            } else if (_currentStep == MaintenanceStep.method) {
              setState(() => _currentStep = MaintenanceStep.summary);
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: RefferTheme.textMuted),
            onPressed: () => _loadBill(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: RefferTheme.navy))
          : _errorMessage != null && _bill == null
              ? _buildErrorState()
              : SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: _buildCurrentStep(),
                ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 48),
            const SizedBox(height: 16),
            Text(
              _errorMessage ?? 'Unable to load maintenance bill',
              textAlign: TextAlign.center,
              style: const TextStyle(color: RefferTheme.textMuted, fontSize: 14),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => _loadBill(),
              style: ElevatedButton.styleFrom(
                backgroundColor: RefferTheme.navy,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Try Again', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (_currentStep) {
      case MaintenanceStep.summary:
        return _buildStepSummary();
      case MaintenanceStep.method:
        return _buildStepMethod();
      case MaintenanceStep.confirmUtr:
        return _buildStepConfirmUtr();
      case MaintenanceStep.receipt:
        return _buildStepReceipt();
    }
  }

  // ==========================================================================
  // STEP 1: SUMMARY / DUE CARD (Exact replica of reffer/app/resident/payments)
  // ==========================================================================
  Widget _buildStepSummary() {
    final bill = _bill!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Flat & Society subtitle
        Padding(
          padding: const EdgeInsets.only(left: 2, bottom: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Flat ${bill.flatNumber} · ${bill.societyName}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: RefferTheme.textMuted,
                ),
              ),
              _buildStatusPill(bill.status),
            ],
          ),
        ),

        // Main Due Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: RefferTheme.cardBg,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: RefferTheme.border),
            boxShadow: const [
              BoxShadow(
                color: Color.fromRGBO(13, 33, 55, 0.05),
                blurRadius: 10,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Rupee Icon & Hero Amount Row
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: RefferTheme.amberLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.currency_rupee_rounded,
                      color: RefferTheme.amber,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Maintenance Due',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: RefferTheme.textMuted,
                        ),
                      ),
                      Text(
                        _formatINR(bill.totalAmount),
                        style: const TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                          color: RefferTheme.navy,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Breakdown items
              Container(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Column(
                  children: [
                    ...bill.breakdown.map((item) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                item.title,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: RefferTheme.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Text(
                                _formatINR(item.amount),
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: RefferTheme.navy,
                                ),
                              ),
                            ],
                          ),
                        )),
                    const SizedBox(height: 6),
                    const Divider(color: RefferTheme.border, height: 1),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total Payable',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: RefferTheme.navy,
                          ),
                        ),
                        Text(
                          _formatINR(bill.totalAmount),
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: RefferTheme.navy,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Due Notice Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: RefferTheme.surface2,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Due by: ${bill.dueDate.isNotEmpty ? bill.dueDate : "10th of next month"} · No late fee if paid before due date',
                  style: const TextStyle(
                    fontSize: 12,
                    color: RefferTheme.textMuted,
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Pay Now CTA Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () {
                    HapticHelper.mediumImpact();
                    setState(() => _currentStep = MaintenanceStep.method);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RefferTheme.navy,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: Text(
                    'Pay Now  (${_formatINR(bill.totalAmount)})',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 28),

        // Payment History Section
        Row(
          children: const [
            Icon(Icons.history_rounded, size: 18, color: RefferTheme.textMuted),
            SizedBox(width: 8),
            Text(
              'Payment History',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: RefferTheme.textPrimary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (_history.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            decoration: BoxDecoration(
              color: RefferTheme.cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: RefferTheme.border),
            ),
            child: Row(
              children: const [
                Icon(Icons.info_outline_rounded, color: RefferTheme.textMuted, size: 20),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'No past payment records found for your flat yet.',
                    style: TextStyle(fontSize: 13, color: RefferTheme.textMuted),
                  ),
                ),
              ],
            ),
          )
        else
          ..._history.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 10.0),
              child: _buildHistoryCard(
                month: item.billingPeriod,
                paidDate: item.paidDateFormatted.isNotEmpty
                    ? item.paidDateFormatted
                    : (item.isPaid
                        ? 'Paid'
                        : (item.isPendingCheck ? 'Pending Verification' : 'Unpaid')),
                amount: item.paidAmount > 0 ? item.paidAmount : item.totalAmount,
                receiptCode: item.receiptNumber ?? item.invoiceNumber,
                isPending: item.isPendingCheck,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildHistoryCard({
    required String month,
    required String paidDate,
    required double amount,
    required String receiptCode,
    bool isPending = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: RefferTheme.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: RefferTheme.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isPending ? const Color(0xFFFEF3C7) : RefferTheme.greenLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isPending ? Icons.hourglass_top_rounded : Icons.check_circle_rounded,
                  color: isPending ? const Color(0xFFD97706) : RefferTheme.green,
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    month,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: RefferTheme.textPrimary),
                  ),
                  const SizedBox(height: 2),
                  Text(paidDate, style: const TextStyle(fontSize: 12, color: RefferTheme.textMuted)),
                ],
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _formatINR(amount),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: RefferTheme.navy),
              ),
              const SizedBox(height: 2),
              Text(receiptCode, style: const TextStyle(fontSize: 11, color: RefferTheme.textMuted, fontFamily: 'monospace')),
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // STEP 2: CHOOSE PAYMENT METHOD (reffer/app/resident/payments + Direct QR)
  // ==========================================================================
  Widget _buildStepMethod() {
    final bill = _bill!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Mini Amount Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: RefferTheme.cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: RefferTheme.border),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Amount to pay', style: TextStyle(fontSize: 12, color: RefferTheme.textMuted)),
                  const SizedBox(height: 2),
                  Text(
                    _formatINR(bill.totalAmount),
                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: RefferTheme.navy),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: RefferTheme.greenLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  '₹0 Gateway Fee',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: RefferTheme.green),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),

        const Text(
          'Select Payment Option',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: RefferTheme.textPrimary),
        ),
        const SizedBox(height: 10),

        // Method 1: Google Pay (GPay)
        _buildMethodOptionCard(
          id: 'upi',
          title: 'Google Pay',
          subtitle: 'Instant 1-tap payment via Google Pay',
          customLeading: Container(
            width: 42,
            height: 42,
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Image.asset(
              'assets/images/gpay.png',
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const Icon(
                Icons.account_balance_wallet_rounded,
                color: Color(0xFF4285F4),
                size: 22,
              ),
            ),
          ),
        ),

        // Inside Google Pay expanded options:
        if (_selectedPaymentType == 'upi') ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: RefferTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Clean prominent Google Pay Button
                InkWell(
                  onTap: () => _launchUpiIntent(package: 'com.google.android.apps.nbu.paisa.user'),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF4285F4), width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF4285F4).withValues(alpha: 0.08),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Image.asset(
                            'assets/images/gpay.png',
                            fit: BoxFit.contain,
                            errorBuilder: (_, _, _) => const Icon(
                              Icons.account_balance_wallet_rounded,
                              color: Color(0xFF4285F4),
                              size: 24,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text(
                                'Pay with Google Pay',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF1F2937),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Tap to open GPay (${_formatINR(bill.totalAmount)})',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: RefferTheme.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF4285F4),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'PAY',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Direct Copy UPI ID Row
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: RefferTheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: RefferTheme.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.shield_outlined, size: 16, color: RefferTheme.green),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          bill.merchantVpa.isNotEmpty ? bill.merchantVpa : 'society@upi',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: RefferTheme.navy),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      InkWell(
                        onTap: () {
                          Clipboard.setData(ClipboardData(text: bill.merchantVpa));
                          HapticHelper.lightImpact();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Society UPI ID copied to clipboard!')),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: RefferTheme.navy,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text('Copy', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 10),

        // Method 2: Scan On-Screen Dynamic QR Code
        _buildMethodOptionCard(
          id: 'qr',
          title: 'Scan QR Code',
          subtitle: 'Scan with any UPI app on another phone or upload image',
          icon: Icons.qr_code_2_rounded,
          iconColor: RefferTheme.navy,
          iconBg: const Color(0xFFEFF6FF),
        ),

        if (_selectedPaymentType == 'qr') ...[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: RefferTheme.border),
            ),
            child: Column(
              children: [
                const Text(
                  'Scan with any UPI Scanner',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: RefferTheme.navy),
                ),
                const SizedBox(height: 4),
                Text(
                  'Amount pre-filled: ${_formatINR(bill.totalAmount)}',
                  style: const TextStyle(fontSize: 12, color: RefferTheme.textMuted),
                ),
                const SizedBox(height: 16),

                // Real Rendered QR Code
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: RefferTheme.border),
                  ),
                  child: QrImageView(
                    data: _buildUpiUri(),
                    version: QrVersions.auto,
                    size: 190.0,
                    backgroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Account: ${bill.merchantName}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: RefferTheme.navy),
                ),
                const SizedBox(height: 4),
                Text(
                  bill.merchantVpa,
                  style: const TextStyle(fontSize: 12, color: RefferTheme.textMuted),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 10),

        // Method 3: Direct Bank Account Transfer (NEFT / IMPS)
        _buildMethodOptionCard(
          id: 'bank',
          title: 'Bank Transfer (NEFT / IMPS)',
          subtitle: 'Direct transfer to society current account',
          icon: Icons.account_balance_rounded,
          iconColor: const Color(0xFF0F766E),
          iconBg: const Color(0xFFCCFBF1),
        ),

        if (_selectedPaymentType == 'bank') ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: RefferTheme.border),
            ),
            child: Column(
              children: [
                _buildBankRow('Beneficiary', bill.societyName),
                const Divider(color: RefferTheme.border, height: 16),
                _buildBankRow('Bank', 'ICICI Bank (Society Account)'),
                const Divider(color: RefferTheme.border, height: 16),
                _buildBankRow('Account Number', '•••• •••• •••• 4589'),
                const Divider(color: RefferTheme.border, height: 16),
                _buildBankRow('IFSC Code', 'ICIC0001234'),
              ],
            ),
          ),
        ],

        const SizedBox(height: 24),

        // Already paid shortcut button
        Center(
          child: TextButton.icon(
            onPressed: () {
              setState(() => _currentStep = MaintenanceStep.confirmUtr);
            },
            icon: const Icon(Icons.check_circle_outline_rounded, size: 16, color: RefferTheme.navy),
            label: const Text(
              'Already paid? Enter 12-Digit UTR directly →',
              style: TextStyle(
                color: RefferTheme.navy,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMethodOptionCard({
    required String id,
    required String title,
    required String subtitle,
    IconData? icon,
    Color? iconColor,
    Color? iconBg,
    Widget? customLeading,
  }) {
    final isSelected = _selectedPaymentType == id;

    return InkWell(
      onTap: () {
        HapticHelper.selectionClick();
        setState(() => _selectedPaymentType = id);
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? RefferTheme.navy : RefferTheme.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            customLeading ??
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: iconBg ?? RefferTheme.surface,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: iconColor, size: 20),
                ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: RefferTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 12, color: RefferTheme.textMuted),
                  ),
                ],
              ),
            ),
            Icon(
              isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
              color: isSelected ? RefferTheme.navy : RefferTheme.border,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBankRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: RefferTheme.textMuted)),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: RefferTheme.navy)),
      ],
    );
  }

  // ==========================================================================
  // STEP 3: CONFIRM UTR (Exact matching reffer flow)
  // ==========================================================================
  Widget _buildStepConfirmUtr() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Top Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: RefferTheme.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: const BoxDecoration(
                      color: RefferTheme.greenLight,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check_rounded, color: RefferTheme.green, size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Payment Done?',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: RefferTheme.navy),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const Text(
                'Enter the 12-digit UPI transaction reference (UTR) from your payment receipt or bank SMS.',
                style: TextStyle(fontSize: 13, color: RefferTheme.textMuted, height: 1.4),
              ),
              const SizedBox(height: 18),

              // 12-digit UTR Input Field
              Container(
                decoration: BoxDecoration(
                  color: RefferTheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: RefferTheme.navy, width: 1.5),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: TextField(
                  controller: _utrController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(16),
                  ],
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: RefferTheme.navy,
                    letterSpacing: 2,
                    fontFamily: 'monospace',
                  ),
                  decoration: const InputDecoration(
                    hintText: '632145879012',
                    hintStyle: TextStyle(color: Color(0xFF94A3B8), letterSpacing: 2),
                    border: InputBorder.none,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Screenshot upload option
              InkWell(
                onTap: _pickScreenshot,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                  decoration: BoxDecoration(
                    color: RefferTheme.surface2,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: RefferTheme.border),
                  ),
                  child: _screenshotFile != null
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.check_circle_rounded, color: RefferTheme.green, size: 18),
                            const SizedBox(width: 8),
                            const Text(
                              'Screenshot attached',
                              style: TextStyle(color: RefferTheme.green, fontWeight: FontWeight.w700, fontSize: 13),
                            ),
                            const SizedBox(width: 12),
                            GestureDetector(
                              onTap: () => setState(() => _screenshotFile = null),
                              child: const Icon(Icons.close_rounded, size: 16, color: Colors.black54),
                            ),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.upload_file_rounded, color: RefferTheme.navy, size: 18),
                            SizedBox(width: 8),
                            Text(
                              'Upload Screenshot (Optional)',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: RefferTheme.navy),
                            ),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 20),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitUtr,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RefferTheme.navy,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text(
                          'Submit for Verification',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Re-open apps button
        SizedBox(
          width: double.infinity,
          height: 46,
          child: OutlinedButton.icon(
            onPressed: () => setState(() => _currentStep = MaintenanceStep.method),
            icon: const Icon(Icons.arrow_back_rounded, size: 16, color: RefferTheme.textMuted),
            label: const Text(
              'Didn\'t Pay Yet? Re-open Payment Apps',
              style: TextStyle(color: RefferTheme.textMuted, fontSize: 13, fontWeight: FontWeight.w600),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: RefferTheme.border),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ],
    );
  }

  // ==========================================================================
  // STEP 4: VERIFIED RECEIPT / SUCCESS (Exact replica of reffer lines 30-70)
  // ==========================================================================
  Widget _buildStepReceipt() {
    final bill = _bill!;
    final isApproved = bill.isPaid;
    final receiptNo = bill.receiptNumber ?? bill.invoiceNumber;

    return Center(
      child: Column(
        children: [
          const SizedBox(height: 10),

          // Big Success/Pending Circle
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: isApproved ? RefferTheme.greenLight : RefferTheme.amberLight,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isApproved ? Icons.check_circle_rounded : Icons.hourglass_top_rounded,
              color: isApproved ? RefferTheme.green : RefferTheme.amber,
              size: 44,
            ),
          ),
          const SizedBox(height: 16),

          Text(
            isApproved ? 'Payment Successful!' : 'Submitted for Verification',
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: RefferTheme.navy,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Maintenance for ${bill.billingPeriod}',
            style: const TextStyle(fontSize: 13, color: RefferTheme.textMuted),
          ),
          const SizedBox(height: 24),

          // Receipt Card (Exact matching reffer lines 39-55)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: RefferTheme.border),
              boxShadow: const [
                BoxShadow(
                  color: Color.fromRGBO(13, 33, 55, 0.05),
                  blurRadius: 10,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                _buildReceiptRow('Amount Paid', _formatINR(bill.totalAmount), bold: true),
                const Divider(color: RefferTheme.border, height: 20),
                _buildReceiptRow('Receipt No.', receiptNo),
                const SizedBox(height: 10),
                _buildReceiptRow('Society', bill.societyName),
                const SizedBox(height: 10),
                _buildReceiptRow('Flat', bill.flatNumber),
                const SizedBox(height: 10),
                _buildReceiptRow('Status', isApproved ? 'Approved by Admin' : 'Pending Bank Match'),
                if (bill.submittedUtr != null) ...[
                  const SizedBox(height: 10),
                  _buildReceiptRow('UTR', bill.submittedUtr!),
                ],
                const SizedBox(height: 10),
                _buildReceiptRow('Method', 'UPI Direct Transfer'),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Share / Download Receipt Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: () {
                final text = 'Payment Receipt\nReceipt No: $receiptNo\nSociety: ${bill.societyName}\nFlat: ${bill.flatNumber}\nAmount: ${_formatINR(bill.totalAmount)}\nUTR: ${bill.submittedUtr ?? "N/A"}\nStatus: ${isApproved ? "PAID" : "SUBMITTED"}';
                SharePlus.instance.share(
                  ShareParams(
                    text: text,
                    subject: 'Payment Receipt - ${bill.flatNumber}',
                  ),
                );
              },
              icon: const Icon(Icons.download_rounded, size: 18, color: RefferTheme.navy),
              label: const Text(
                'Download / Share Receipt',
                style: TextStyle(fontWeight: FontWeight.w700, color: RefferTheme.navy),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: RefferTheme.border),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Cancel submission if still pending
          if (!isApproved)
            TextButton.icon(
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Cancel Submission?'),
                    content: const Text('This will reset your bill so you can re-open your UPI app and pay again.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('No')),
                      ElevatedButton(
                        onPressed: () => Navigator.of(ctx).pop(true),
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                        child: const Text('Cancel & Pay Again', style: TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                );
                if (confirm == true && mounted) {
                  await ApiService.cancelMaintenanceSubmission(bill.invoiceId);
                  await _loadBill();
                  setState(() => _currentStep = MaintenanceStep.method);
                }
              },
              icon: const Icon(Icons.refresh_rounded, size: 16, color: RefferTheme.textMuted),
              label: const Text('Cancel Submission & Pay Again', style: TextStyle(color: RefferTheme.textMuted, fontSize: 13)),
            ),

          const SizedBox(height: 8),

          TextButton(
            onPressed: () => setState(() => _currentStep = MaintenanceStep.summary),
            child: const Text('Back to Maintenance', style: TextStyle(color: RefferTheme.navy, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: RefferTheme.textMuted)),
        Flexible(
          child: Text(
            value,
            style: TextStyle(
              fontSize: bold ? 17 : 13,
              fontWeight: bold ? FontWeight.w900 : FontWeight.w600,
              color: RefferTheme.navy,
            ),
            textAlign: TextAlign.right,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildStatusPill(String status) {
    Color bg;
    Color fg;
    String label;

    switch (status.toUpperCase()) {
      case 'PAID':
        bg = RefferTheme.greenLight;
        fg = RefferTheme.green;
        label = 'Paid';
        break;
      case 'PENDING_CHECK':
        bg = RefferTheme.amberLight;
        fg = RefferTheme.amber;
        label = 'Pending check';
        break;
      case 'UNPAID':
      default:
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFFDC2626);
        label = 'Unpaid';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}
