import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../../../repositories/visitor_repository.dart';
import '../../../services/api_service.dart';
import '../../../services/image_compress_service.dart';
import 'pass_scanner_screen.dart';

/// Elite, modern Gate Checkpoint Dialog for Pre-Approved Visitor Passes.
///
/// Flow:
/// 1. [Input]: Scan QR code with camera or enter 6-digit PIN in individual digit boxes.
/// 2. [Checkpoint]: Inspects pass details (Host, Flat, Visitor) and captures visitor photo at the gate.
/// 3. [Success]: Confirms gate check-in with the real visitor photo and gate timestamp.
class VerifyPassDialog extends StatefulWidget {
  final VisitorRepository visitorRepo;

  const VerifyPassDialog({super.key, required this.visitorRepo});

  static Future<void> show(BuildContext context,
      {required VisitorRepository visitorRepo}) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => VerifyPassDialog(visitorRepo: visitorRepo),
    );
  }

  @override
  State<VerifyPassDialog> createState() => _VerifyPassDialogState();
}

enum _PassStep { input, checkpoint, success }

class _VerifyPassDialogState extends State<VerifyPassDialog> {
  _PassStep _step = _PassStep.input;

  final TextEditingController _codeController = TextEditingController();
  final FocusNode _codeFocusNode = FocusNode();

  final TextEditingController _vehicleController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  bool _isLoading = false;
  bool _isCheckingIn = false;
  String? _errorMessage;

  Map<String, dynamic>? _verifiedData;
  Map<String, dynamic>? _confirmedData;
  String? _photoPath;

  @override
  void initState() {
    super.initState();
    _codeController.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _codeController.dispose();
    _codeFocusNode.dispose();
    _vehicleController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _clearError() {
    if (_errorMessage != null) {
      setState(() => _errorMessage = null);
    }
  }

  /// Step 1: Lookup pass details without admitting/consuming the pass
  Future<void> _handleLookup([String? directCode]) async {
    final code = (directCode ?? _codeController.text).trim();
    final cleanCode = code.replaceAll(RegExp(r'\D'), '');
    if (cleanCode.isEmpty || cleanCode.length < 4) {
      setState(() {
        _errorMessage = 'Please enter a valid 6-digit pass code';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService.lookupPassCode(cleanCode);
      if (!mounted) return;
      final invite = res['data']?['invite'];
      if (invite != null) {
        _phoneController.text = (invite['visitorPhone'] ?? '').toString();
        setState(() {
          _verifiedData = invite;
          _step = _PassStep.checkpoint;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  /// Open full-screen camera QR scanner
  Future<void> _openCameraScanner() async {
    final scannedCode = await PassScannerScreen.open(context);
    if (!mounted || scannedCode == null || scannedCode.trim().isEmpty) return;

    final code = scannedCode.trim().replaceAll(RegExp(r'\D'), '');
    _codeController.text = code;
    _handleLookup(code);
  }

  /// Quick capture of visitor photo right at the gate
  Future<void> _captureVisitorPhoto() async {
    try {
      final picker = ImagePicker();
      final XFile? photo = await picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.rear,
      );
      if (photo == null) return;

      final compressed = await ImageCompressService.compress(photo.path);
      if (!mounted) return;
      setState(() {
        _photoPath = compressed;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Camera error: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  /// Step 2: Confirm Gate Entry & Check In with captured photo
  Future<void> _handleCheckIn() async {
    if (_isCheckingIn) return;
    final invite = _verifiedData!;
    final passCode = (invite['passCode'] ?? _codeController.text).toString();

    setState(() {
      _isCheckingIn = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService.checkInPassCode(
        passCode: passCode,
        photoPath: _photoPath,
        vehicleNumber: _vehicleController.text.trim(),
        visitorPhone: _phoneController.text.trim(),
      );

      if (!mounted) return;
      setState(() {
        _confirmedData = res['data']?['invite'] ?? _verifiedData;
        _step = _PassStep.success;
        _isCheckingIn = false;
      });

      // Refresh guard activity log
      widget.visitorRepo.refreshStatus();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
        _isCheckingIn = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      backgroundColor: Colors.white,
      elevation: 16,
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 440),
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 24),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: _buildCurrentView(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentView() {
    switch (_step) {
      case _PassStep.input:
        return _buildInputView();
      case _PassStep.checkpoint:
        return _buildCheckpointView();
      case _PassStep.success:
        return _buildSuccessView();
    }
  }

  // =============================================================
  // STAGE 1: VERIFY ENTRY PASS (IMAGE 1 OVERHAULED)
  // =============================================================
  Widget _buildInputView() {
    final codeText = _codeController.text;

    return Column(
      key: const ValueKey('input_step'),
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Header with Society Shield & Close
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4F46E5), Color(0xFF3730A3)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF4F46E5).withOpacity(0.28),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.qr_code_scanner_rounded,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Verify Entry Pass',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.3,
                        fontFamily: 'Inter',
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Pre-Approved Resident Invite',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w600,
                        fontFamily: 'Inter',
                      ),
                    ),
                  ],
                ),
              ],
            ),
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => Navigator.of(context).pop(),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: 34,
                  height: 34,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF1F5F9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.close_rounded,
                    color: Color(0xFF64748B),
                    size: 18,
                  ),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 20),

        // 2. High-Tech QR Scanner Card
        Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          child: InkWell(
            onTap: _isLoading ? null : _openCameraScanner,
            borderRadius: BorderRadius.circular(20),
            child: Ink(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E1B4B), Color(0xFF312E81)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF312E81).withOpacity(0.35),
                    blurRadius: 14,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: Colors.white.withOpacity(0.20),
                        width: 1.2,
                      ),
                    ),
                    child: const Icon(
                      Icons.camera_alt_rounded,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'SCAN QR WITH CAMERA',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 13.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                                fontFamily: 'Inter',
                              ),
                            ),
                            SizedBox(width: 6),
                            Icon(Icons.qr_code_2_rounded,
                                color: Color(0xFF34D399), size: 18),
                          ],
                        ),
                        SizedBox(height: 3),
                        Text(
                          'Point camera at visitor\'s phone / pass',
                          style: TextStyle(
                            color: Color(0xFFC7D2FE),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            fontFamily: 'Inter',
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.arrow_forward_ios_rounded,
                      color: Colors.white,
                      size: 13,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        const SizedBox(height: 22),

        // 3. Elegant Divider
        Row(
          children: [
            Expanded(
              child: Container(
                height: 1,
                color: const Color(0xFFE2E8F0),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.pin_outlined,
                      size: 14, color: Colors.blueGrey.shade400),
                  const SizedBox(width: 6),
                  Text(
                    'OR ENTER 6-DIGIT CODE',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.blueGrey.shade500,
                      letterSpacing: 0.8,
                      fontFamily: 'Inter',
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Container(
                height: 1,
                color: const Color(0xFFE2E8F0),
              ),
            ),
          ],
        ),

        const SizedBox(height: 20),

        // 4. Individual 6-Digit PIN Display Boxes
        GestureDetector(
          onTap: () => _codeFocusNode.requestFocus(),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Hidden native TextField
              Opacity(
                opacity: 0.0,
                child: SizedBox(
                  width: 1,
                  height: 1,
                  child: TextField(
                    controller: _codeController,
                    focusNode: _codeFocusNode,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    onChanged: (val) {
                      _clearError();
                      if (val.length == 6) {
                        _handleLookup(val);
                      }
                    },
                  ),
                ),
              ),

              // Visual 6-Digit Boxes
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(6, (index) {
                  final isFilled = index < codeText.length;
                  final isCurrent = index == codeText.length;
                  final char = isFilled ? codeText[index] : '';

                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: 46,
                    height: 54,
                    decoration: BoxDecoration(
                      color: isFilled
                          ? const Color(0xFFEEF2FF)
                          : (isCurrent
                              ? Colors.white
                              : const Color(0xFFF8FAFC)),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: _errorMessage != null
                            ? const Color(0xFFEF4444)
                            : (isCurrent
                                ? const Color(0xFF4F46E5)
                                : (isFilled
                                    ? const Color(0xFF6366F1)
                                    : const Color(0xFFD5DAE6))),
                        width: (isCurrent || isFilled) ? 2.0 : 1.2,
                      ),
                      boxShadow: isCurrent
                          ? [
                              BoxShadow(
                                color: const Color(0xFF4F46E5).withOpacity(0.18),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              )
                            ]
                          : null,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      char,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1E1B4B),
                        fontFamily: 'Inter',
                      ),
                    ),
                  );
                }),
              ),
            ],
          ),
        ),

        if (codeText.isNotEmpty) ...[
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () {
                _codeController.clear();
                _clearError();
                _codeFocusNode.requestFocus();
              },
              icon: const Icon(Icons.backspace_outlined, size: 15),
              label: const Text('Clear', style: TextStyle(fontSize: 12)),
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF64748B),
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
            ),
          ),
        ],

        if (_errorMessage != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline_rounded,
                    color: Color(0xFFEF4444), size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(
                      color: Color(0xFFDC2626),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'Inter',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 20),

        // 5. Submit Button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F172A),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 0,
            ),
            onPressed: _isLoading ? null : () => _handleLookup(),
            child: _isLoading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2.5,
                    ),
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.shield_outlined,
                          size: 19, color: Colors.white),
                      SizedBox(width: 8),
                      Text(
                        'VERIFY PASS DETAILS',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                          fontFamily: 'Inter',
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ],
    );
  }

  // =============================================================
  // STAGE 2: PRE-APPROVED VISITOR CHECKPOINT (IMAGE 2 OVERHAULED)
  // =============================================================
  Widget _buildCheckpointView() {
    final invite = _verifiedData!;
    final visitorName = (invite['visitorName'] ?? 'Visitor').toString();
    final flatNumber = (invite['flatNumber'] ?? 'Flat').toString();
    final wing = (invite['wing'] ?? '').toString();
    final residentName = (invite['residentName'] ?? 'Resident').toString();
    final passCode = (invite['passCode'] ?? '').toString();
    final purpose = (invite['purpose'] ?? 'GUEST').toString().toUpperCase();

    return Column(
      key: const ValueKey('checkpoint_step'),
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Status Pill & Back Button
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle_rounded,
                      color: Color(0xFF059669), size: 15),
                  const SizedBox(width: 6),
                  Text(
                    'PASS #$passCode · VALID',
                    style: const TextStyle(
                      color: Color(0xFF047857),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                      fontFamily: 'Inter',
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close_rounded,
                  color: Color(0xFF64748B), size: 20),
              onPressed: () {
                setState(() {
                  _step = _PassStep.input;
                  _errorMessage = null;
                });
              },
            ),
          ],
        ),

        const SizedBox(height: 12),

        // 2. Heading
        const Text(
          'Visitor Checkpoint',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            letterSpacing: -0.3,
            fontFamily: 'Inter',
          ),
        ),
        const SizedBox(height: 2),
        const Text(
          'Capture visitor snapshot before granting entry',
          style: TextStyle(
            fontSize: 12.5,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.w500,
            fontFamily: 'Inter',
          ),
        ),

        const SizedBox(height: 16),

        // 3. Host & Destination Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              _buildDetailItem(
                icon: Icons.apartment_rounded,
                iconColor: const Color(0xFF4F46E5),
                label: 'Destination',
                value: 'Flat $flatNumber${wing.isNotEmpty ? ' (Wing $wing)' : ''}',
                highlightValue: true,
              ),
              const Divider(height: 16),
              _buildDetailItem(
                icon: Icons.person_rounded,
                iconColor: const Color(0xFF0284C7),
                label: 'Authorized By',
                value: residentName,
              ),
              const Divider(height: 16),
              _buildDetailItem(
                icon: Icons.badge_rounded,
                iconColor: const Color(0xFF10B981),
                label: 'Visitor Name',
                value: visitorName,
                highlightValue: true,
              ),
              const Divider(height: 16),
              _buildDetailItem(
                icon: Icons.category_rounded,
                iconColor: const Color(0xFFF59E0B),
                label: 'Purpose',
                value: purpose,
              ),
            ],
          ),
        ),

        const SizedBox(height: 18),

        // 4. Visitor Photo Station (Gate Verification)
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: _photoPath != null
                ? const Color(0xFFF0FDF4)
                : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: _photoPath != null
                  ? const Color(0xFF86EFAC)
                  : const Color(0xFFCBD5E1),
              width: 1.5,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.camera_enhance_rounded,
                        size: 18,
                        color: _photoPath != null
                            ? const Color(0xFF059669)
                            : const Color(0xFF4F46E5),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Visitor Photo at Gate',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                          color: _photoPath != null
                              ? const Color(0xFF047857)
                              : const Color(0xFF0F172A),
                          fontFamily: 'Inter',
                        ),
                      ),
                    ],
                  ),
                  if (_photoPath != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.check_rounded,
                              size: 12, color: Color(0xFF16A34A)),
                          SizedBox(width: 4),
                          Text(
                            'Captured',
                            style: TextStyle(
                              color: Color(0xFF16A34A),
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),

              if (_photoPath == null)
                Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    onTap: _captureVisitorPhoto,
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: const Color(0xFFA5B4FC),
                          width: 1.2,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: const Color(0xFF4F46E5),
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color:
                                      const Color(0xFF4F46E5).withOpacity(0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.camera_alt_rounded,
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'Tap to Take Visitor Photo',
                            style: TextStyle(
                              color: Color(0xFF312E81),
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'Inter',
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Quick gate snapshot for resident notification',
                            style: TextStyle(
                              color: Color(0xFF6366F1),
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              fontFamily: 'Inter',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Stack(
                    children: [
                      Image.file(
                        File(_photoPath!),
                        height: 130,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Material(
                          color: Colors.black.withOpacity(0.65),
                          borderRadius: BorderRadius.circular(20),
                          child: InkWell(
                            onTap: _captureVisitorPhoto,
                            borderRadius: BorderRadius.circular(20),
                            child: const Padding(
                              padding: EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 5),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.refresh_rounded,
                                      color: Colors.white, size: 14),
                                  SizedBox(width: 4),
                                  Text(
                                    'Retake',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // 5. Vehicle Number Input (Optional)
        TextField(
          controller: _vehicleController,
          textCapitalization: TextCapitalization.characters,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0F172A),
          ),
          decoration: InputDecoration(
            isDense: true,
            hintText: 'Vehicle No. (e.g. MH 12 AB 1234 or Cab)',
            hintStyle: TextStyle(
              fontSize: 13,
              color: Colors.blueGrey.shade300,
              fontWeight: FontWeight.w500,
            ),
            prefixIcon: const Icon(Icons.directions_car_rounded,
                color: Color(0xFF64748B), size: 20),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide:
                  const BorderSide(color: Color(0xFF4F46E5), width: 1.5),
            ),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
        ),

        if (_errorMessage != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline_rounded,
                    color: Color(0xFFEF4444), size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(
                      color: Color(0xFFDC2626),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 20),

        // 6. Action Buttons
        SizedBox(
          width: double.infinity,
          height: 54,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 2,
            ),
            onPressed: _isCheckingIn ? null : _handleCheckIn,
            child: _isCheckingIn
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2.5,
                    ),
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.door_sliding_rounded, size: 22),
                      SizedBox(width: 8),
                      Text(
                        'ALLOW ENTRY & OPEN GATE',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          fontFamily: 'Inter',
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ],
    );
  }

  // =============================================================
  // STAGE 3: GATE ENTRY CONFIRMED CELEBRATION
  // =============================================================
  Widget _buildSuccessView() {
    final invite = _confirmedData ?? _verifiedData ?? {};
    final visitorName = (invite['visitorName'] ?? 'Visitor').toString();
    final flatNumber = (invite['flatNumber'] ?? 'Flat').toString();
    final residentName = (invite['residentName'] ?? 'Resident').toString();
    final passCode = (invite['passCode'] ?? '').toString();

    return Column(
      key: const ValueKey('success_step'),
      mainAxisSize: MainAxisSize.min,
      children: [
        // 1. Success Animated Icon
        Container(
          width: 70,
          height: 70,
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF10B981).withOpacity(0.25),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: const Icon(
            Icons.check_circle_rounded,
            color: Color(0xFF059669),
            size: 44,
          ),
        ),

        const SizedBox(height: 16),

        const Text(
          'ENTRY APPROVED',
          style: TextStyle(
            fontSize: 21,
            fontWeight: FontWeight.w900,
            color: Color(0xFF047857),
            letterSpacing: 0.8,
            fontFamily: 'Inter',
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Pre-Approved Pass #$passCode Checked In',
          style: const TextStyle(
            fontSize: 12.5,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.w600,
            fontFamily: 'Inter',
          ),
        ),

        const SizedBox(height: 20),

        // 2. Photo & Visitor Summary Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              if (_photoPath != null) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.file(
                    File(_photoPath!),
                    height: 110,
                    width: 110,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 14),
              ],
              _buildSimpleRow('Visitor Name', visitorName),
              const Divider(height: 16),
              _buildSimpleRow('Destination', 'Flat $flatNumber'),
              const Divider(height: 16),
              _buildSimpleRow('Authorized By', residentName),
              if (_vehicleController.text.trim().isNotEmpty) ...[
                const Divider(height: 16),
                _buildSimpleRow(
                    'Vehicle', _vehicleController.text.trim().toUpperCase()),
              ],
            ],
          ),
        ),

        const SizedBox(height: 24),

        // 3. Done Button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 2,
            ),
            onPressed: () => Navigator.of(context).pop(),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_rounded, size: 22),
                SizedBox(width: 8),
                Text(
                  'OPEN GATE / DONE',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                    fontFamily: 'Inter',
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailItem({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    bool highlightValue = false,
  }) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 17),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11.5,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                  fontFamily: 'Inter',
                ),
              ),
              const SizedBox(height: 1),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight:
                      highlightValue ? FontWeight.w800 : FontWeight.w700,
                  color: highlightValue
                      ? const Color(0xFF0F172A)
                      : const Color(0xFF334155),
                  fontFamily: 'Inter',
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSimpleRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12.5,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.w500,
            fontFamily: 'Inter',
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F172A),
            fontFamily: 'Inter',
          ),
        ),
      ],
    );
  }
}
