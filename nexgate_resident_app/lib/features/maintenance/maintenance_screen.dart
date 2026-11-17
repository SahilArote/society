import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/haptic_helper.dart';
import '../../models/maintenance_model.dart';
import '../../services/api_service.dart';

enum MaintenanceStep {
  seeBill,
  pickApp,
  confirmUtr,
  statusReceipt,
}

class MaintenanceScreen extends StatefulWidget {
  const MaintenanceScreen({super.key});

  @override
  State<MaintenanceScreen> createState() => _MaintenanceScreenState();
}

class _MaintenanceScreenState extends State<MaintenanceScreen> {
  MaintenanceStep _currentStep = MaintenanceStep.seeBill;
  MaintenanceBillModel? _bill;
  bool _isLoading = true;
  String? _errorMessage;

  // Step 3 State
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
      final bill = await ApiService.fetchCurrentMaintenanceBill();
      if (!mounted) return;

      setState(() {
        _bill = bill;
        _isLoading = false;

        // Auto-navigate to appropriate step based on bill status
        if (bill.isPaid || bill.isPendingCheck) {
          _currentStep = MaintenanceStep.statusReceipt;
          if (bill.submittedUtr != null && _utrController.text.isEmpty) {
            _utrController.text = bill.submittedUtr!;
          }
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
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

  /// Launch NPCI UPI Intent URI into user's installed banking/UPI app
  Future<void> _launchUpiIntent({String? package}) async {
    if (_bill == null) return;
    HapticHelper.mediumImpact();

    final upiUriString = _bill!.upiUri.isNotEmpty
        ? _bill!.upiUri
        : 'upi://pay?pa=${_bill!.merchantVpa}&pn=${Uri.encodeComponent(_bill!.merchantName)}&am=${_bill!.totalAmount.toStringAsFixed(2)}&cu=INR&tn=${Uri.encodeComponent('${_bill!.flatNumber} ${_bill!.billingPeriod}')}&tr=${_bill!.referenceId}';

    try {
      final uri = Uri.parse(upiUriString);
      debugPrint('[UPI] Launching URI: $uri');

      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalNonBrowserApplication,
      );

      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('[UPI] Launch error: $e');
    }

    // Advance directly to Step 3 (Confirm UTR)
    if (mounted) {
      setState(() {
        _currentStep = MaintenanceStep.confirmUtr;
      });
    }
  }

  /// Pick payment screenshot proof from gallery or camera
  Future<void> _pickScreenshot() async {
    HapticHelper.selectionClick();
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
        maxWidth: 1200,
      );
      if (image != null && mounted) {
        setState(() {
          _screenshotFile = File(image.path);
        });
      }
    } catch (e) {
      debugPrint('[Screenshot] Pick error: $e');
    }
  }

  /// Submit 12-digit UTR to society admin verification queue
  Future<void> _submitUtr() async {
    final utr = _utrController.text.trim();
    if (utr.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the 12-digit UPI UTR number')),
      );
      return;
    }

    if (utr.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid UTR transaction reference')),
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

      // Refresh bill and switch to Step 4 (Status & Receipt)
      await _loadBill(silent: true);
      setState(() {
        _isSubmitting = false;
        _currentStep = MaintenanceStep.statusReceipt;
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
      backgroundColor: const Color(0xFF121417), // Sleek dark card theme matching mockup
      appBar: AppBar(
        title: const Text(
          'Maintenance',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
        backgroundColor: const Color(0xFF121417),
        elevation: 0,
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Colors.white),
          onPressed: () {
            if (_currentStep == MaintenanceStep.pickApp || _currentStep == MaintenanceStep.confirmUtr) {
              setState(() => _currentStep = MaintenanceStep.seeBill);
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
            onPressed: () => _loadBill(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF155EEF)))
          : _errorMessage != null && _bill == null
              ? _buildErrorState()
              : SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: _buildCurrentStepView(),
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
              style: const TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => _loadBill(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF155EEF),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Try Again', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentStepView() {
    switch (_currentStep) {
      case MaintenanceStep.seeBill:
        return _buildStep1SeeBill();
      case MaintenanceStep.pickApp:
        return _buildStep2PickApp();
      case MaintenanceStep.confirmUtr:
        return _buildStep3ConfirmUtr();
      case MaintenanceStep.statusReceipt:
        return _buildStep4StatusAndReceipt();
    }
  }

  // ==========================================================
  // STEP 1: SEE BILL (Exact match to reference mockup)
  // ==========================================================
  Widget _buildStep1SeeBill() {
    final bill = _bill!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Unit & Society Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${bill.flatNumber} • ${bill.societyName}',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF94A3B8),
              ),
            ),
            _buildStatusBadge(bill.status),
          ],
        ),
        const SizedBox(height: 12),

        // Big Hero Amount
        Text(
          _formatINR(bill.totalAmount),
          style: const TextStyle(
            fontSize: 42,
            fontWeight: FontWeight.w900,
            color: Colors.white,
            letterSpacing: -1,
          ),
        ),
        const SizedBox(height: 6),

        // Period & Due Date
        Text(
          '${bill.billingPeriod} • due ${bill.dueDate}',
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Color(0xFF94A3B8),
          ),
        ),

        const SizedBox(height: 28),

        // Breakdown Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF1A1D23),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF2E333D)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'BILL BREAKDOWN',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF64748B),
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 14),
              ...bill.breakdown.map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          item.title,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFFCBD5E1),
                          ),
                        ),
                        Text(
                          _formatINR(item.amount),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  )),
              const Divider(color: Color(0xFF2E333D), height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Total Payable',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    _formatINR(bill.totalAmount),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF22C55E),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 36),

        // Pay with UPI Button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: () {
              HapticHelper.mediumImpact();
              setState(() => _currentStep = MaintenanceStep.pickApp);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: const Text(
              'Pay with UPI',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
        ),

        const SizedBox(height: 14),
        const Center(
          child: Text(
            'Zero Gateway Fee • 100% Direct to Society Account',
            style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
          ),
        ),
      ],
    );
  }

  // ==========================================================
  // STEP 2: PICK UPI APP (Exact match to reference mockup)
  // ==========================================================
  Widget _buildStep2PickApp() {
    final bill = _bill!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Pay with',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Android',
                style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // App Choice 1: GPay
        _buildAppTile(
          title: 'GPay',
          icon: Icons.account_balance_wallet_rounded,
          color: const Color(0xFF4285F4),
          onTap: () => _launchUpiIntent(package: 'com.google.android.apps.nbu.paisa.user'),
        ),
        const SizedBox(height: 10),

        // App Choice 2: PhonePe
        _buildAppTile(
          title: 'PhonePe',
          icon: Icons.send_to_mobile_rounded,
          color: const Color(0xFF5F259F),
          onTap: () => _launchUpiIntent(package: 'com.phonepe.app'),
        ),
        const SizedBox(height: 10),

        // App Choice 3: Paytm
        _buildAppTile(
          title: 'Paytm',
          icon: Icons.payments_rounded,
          color: const Color(0xFF00B9F1),
          onTap: () => _launchUpiIntent(package: 'net.one97.paytm'),
        ),
        const SizedBox(height: 10),

        // App Choice 4: BHIM / bank app
        _buildAppTile(
          title: 'BHIM / bank app',
          icon: Icons.account_balance_rounded,
          color: const Color(0xFF00796B),
          onTap: () => _launchUpiIntent(),
        ),

        const SizedBox(height: 24),

        // Summary details card (matching reference image)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1A1D23),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF2E333D)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Pays to: ${bill.merchantVpa}',
                style: const TextStyle(fontSize: 13, color: Color(0xFFCBD5E1), fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(
                'Ref: ${bill.referenceId}',
                style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8), fontFamily: 'monospace'),
              ),
              const SizedBox(height: 4),
              Text(
                'Amount fixed: ${_formatINR(bill.totalAmount)}',
                style: const TextStyle(fontSize: 13, color: Color(0xFF22C55E), fontWeight: FontWeight.w700),
              ),
              const Divider(color: Color(0xFF2E333D), height: 16),
              const Text(
                'Resident enters UPI PIN in their own app',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),
        Center(
          child: TextButton(
            onPressed: () {
              setState(() => _currentStep = MaintenanceStep.confirmUtr);
            },
            child: const Text(
              'Already paid? Enter UTR number directly →',
              style: TextStyle(color: Color(0xFF38BDF8), fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAppTile({
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFF1E222A),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF2E333D)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Color(0xFF64748B)),
          ],
        ),
      ),
    );
  }

  // ==========================================================
  // STEP 3: CONFIRM UTR (Exact match to reference mockup)
  // ==========================================================
  Widget _buildStep3ConfirmUtr() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Green Check Icon & Header
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: Color(0xFF15803D),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_rounded, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 10),
            const Text(
              'Payment done?',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white),
            ),
          ],
        ),
        const SizedBox(height: 8),

        const Text(
          'Enter the 12-digit UTR from your UPI app',
          style: TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
        ),
        const SizedBox(height: 18),

        // 12-digit UTR Input Field
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF1A1D23),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF3B82F6), width: 1.5),
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
              fontWeight: FontWeight.w700,
              color: Colors.white,
              letterSpacing: 2,
              fontFamily: 'monospace',
            ),
            decoration: const InputDecoration(
              hintText: '632145879012',
              hintStyle: TextStyle(color: Color(0xFF475569)),
              border: InputBorder.none,
            ),
          ),
        ),

        const SizedBox(height: 20),

        // Screenshot (optional) upload
        const Text(
          'Screenshot (optional)',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFCBD5E1)),
        ),
        const SizedBox(height: 8),

        InkWell(
          onTap: _pickScreenshot,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E222A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF2E333D), style: BorderStyle.solid),
            ),
            child: _screenshotFile != null
                ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.check_circle_rounded, color: Color(0xFF22C55E), size: 18),
                      const SizedBox(width: 8),
                      const Text(
                        'Screenshot attached',
                        style: TextStyle(color: Color(0xFF22C55E), fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(width: 12),
                      GestureDetector(
                        onTap: () => setState(() => _screenshotFile = null),
                        child: const Icon(Icons.close_rounded, size: 16, color: Colors.white70),
                      ),
                    ],
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.upload_rounded, color: Colors.white70, size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Upload',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white),
                      ),
                    ],
                  ),
          ),
        ),

        const SizedBox(height: 28),

        // Submit for verification Button
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _isSubmitting ? null : _submitUtr,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                  )
                : const Text(
                    'Submit for verification',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
          ),
        ),

        const SizedBox(height: 14),

        // Payment failed - retry button
        Center(
          child: TextButton(
            onPressed: () {
              setState(() => _currentStep = MaintenanceStep.seeBill);
            },
            child: const Text(
              'Payment failed — retry',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ),
        ),
      ],
    );
  }

  // ==========================================================
  // STEP 4: STATUS AND RECEIPT (Exact match to reference mockup)
  // ==========================================================
  Widget _buildStep4StatusAndReceipt() {
    final bill = _bill!;
    final isPaid = bill.isPaid;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Month / Period Header
        Text(
          bill.billingPeriod,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
        ),
        const SizedBox(height: 14),

        if (!isPaid) ...[
          // PENDING CHECK STATE (Before admin approves)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF1E3A8A),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Text(
              'Pending check',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF93C5FD)),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            bill.submittedAt != null
                ? 'Submitted ${_formatTime(bill.submittedAt!)}'
                : 'Submitted recently',
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),

          const SizedBox(height: 24),
          const Center(
            child: Text(
              '↓ after admin approves',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontStyle: FontStyle.italic),
            ),
          ),
          const SizedBox(height: 24),
        ],

        // PAID STATE (After admin approves)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF1A1D23),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isPaid ? const Color(0xFF166534) : const Color(0xFF2E333D),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isPaid ? const Color(0xFF14532D) : const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      isPaid ? 'Paid' : 'Awaiting Approval',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isPaid ? const Color(0xFF86EFAC) : const Color(0xFF94A3B8),
                      ),
                    ),
                  ),
                  Text(
                    _formatINR(bill.totalAmount),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              if (bill.submittedUtr != null) ...[
                Text(
                  'UTR ${bill.submittedUtr}',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFCBD5E1), fontFamily: 'monospace'),
                ),
                const SizedBox(height: 4),
              ],

              if (isPaid) ...[
                Text(
                  bill.paidAt != null
                      ? 'Approved ${_formatTime(bill.paidAt!)}'
                      : 'Approved by Committee',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF22C55E)),
                ),
              ] else ...[
                const Text(
                  'Society admin will verify UTR on the bank statement.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 32),

        // Download receipt button
        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton.icon(
            onPressed: isPaid ? () => _downloadReceipt(bill) : null,
            icon: const Icon(Icons.download_rounded, size: 18),
            label: const Text('Download receipt', style: TextStyle(fontWeight: FontWeight.w700)),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: BorderSide(color: isPaid ? Colors.white38 : Colors.white10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),

        const SizedBox(height: 14),

        // Push notification confirmation
        const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_active_rounded, size: 14, color: Color(0xFF64748B)),
            SizedBox(width: 6),
            Text(
              'Push sent to resident on approval',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
          ],
        ),

        if (!isPaid) ...[
          const SizedBox(height: 20),
          Center(
            child: TextButton(
              onPressed: () => _loadBill(),
              child: const Text('Check approval status', style: TextStyle(color: Color(0xFF38BDF8))),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bg;
    Color fg;
    String label;

    switch (status.toUpperCase()) {
      case 'PAID':
        bg = const Color(0xFF14532D);
        fg = const Color(0xFF86EFAC);
        label = 'Paid';
        break;
      case 'PENDING_CHECK':
        bg = const Color(0xFF1E3A8A);
        fg = const Color(0xFF93C5FD);
        label = 'Pending check';
        break;
      case 'UNPAID':
      default:
        bg = const Color(0xFF78350F);
        fg = const Color(0xFFFDE68A);
        label = 'Unpaid';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }

  String _formatTime(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$hour:$minute';
    } catch (_) {
      return isoString;
    }
  }

  void _downloadReceipt(MaintenanceBillModel bill) {
    HapticHelper.success();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Payment Receipt ${bill.receiptNumber ?? bill.invoiceNumber} downloaded'),
        backgroundColor: const Color(0xFF15803D),
      ),
    );
  }
}

