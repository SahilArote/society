import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/constants/app_colors.dart';

/// Full-screen high-visibility Camera QR Scanner designed specifically for Gate Guards.
/// Optimized with large touch targets, flashlight toggle, and automatic code extraction.
class PassScannerScreen extends StatefulWidget {
  const PassScannerScreen({super.key});

  static Future<String?> open(BuildContext context) {
    return Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => const PassScannerScreen(),
      ),
    );
  }

  @override
  State<PassScannerScreen> createState() => _PassScannerScreenState();
}

class _PassScannerScreenState extends State<PassScannerScreen>
    with SingleTickerProviderStateMixin {
  late MobileScannerController _controller;
  late AnimationController _animController;
  bool _isTorchOn = false;
  bool _hasDetected = false;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  /// Parses the raw QR payload to extract the actual 4-8 digit pass code
  static String extractPassCode(String raw) {
    final clean = raw.trim();
    if (clean.startsWith('NEXGATE-PASS:')) {
      final parts = clean.split(':');
      if (parts.length > 1 && parts[1].trim().isNotEmpty) {
        return parts[1].trim();
      }
    }
    final match = RegExp(r'\b\d{4,8}\b').firstMatch(clean);
    if (match != null) {
      return match.group(0)!;
    }
    return clean.replaceAll(RegExp(r'\D'), '');
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasDetected) return;

    for (final barcode in capture.barcodes) {
      final raw = barcode.rawValue;
      if (raw != null && raw.trim().isNotEmpty) {
        final code = extractPassCode(raw);
        if (code.isNotEmpty) {
          setState(() => _hasDetected = true);
          Navigator.of(context).pop(code);
          return;
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final scanAreaSize = math.min(size.width * 0.72, 280.0);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. Live Camera Feed
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),

          // 2. Darkened Mask around Target Box
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              Colors.black.withOpacity(0.65),
              BlendMode.srcOut,
            ),
            child: Stack(
              children: [
                Container(
                  decoration: const BoxDecoration(
                    color: Colors.transparent,
                    backgroundBlendMode: BlendMode.dstOut,
                  ),
                ),
                Align(
                  alignment: Alignment.center,
                  child: Container(
                    width: scanAreaSize,
                    height: scanAreaSize,
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 3. Viewfinder Frame & Animated Laser Line
          Align(
            alignment: Alignment.center,
            child: SizedBox(
              width: scanAreaSize,
              height: scanAreaSize,
              child: Stack(
                children: [
                  // Corner brackets
                  CustomPaint(
                    size: Size(scanAreaSize, scanAreaSize),
                    painter: _ScannerBorderPainter(),
                  ),

                  // Animated laser scanning line
                  AnimatedBuilder(
                    animation: _animController,
                    builder: (context, child) {
                      final topOffset =
                          _animController.value * (scanAreaSize - 20) + 10;
                      return Positioned(
                        top: topOffset,
                        left: 12,
                        right: 12,
                        child: Container(
                          height: 3,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [
                                Colors.transparent,
                                Color(0xFF6366F1),
                                Colors.white,
                                Color(0xFF6366F1),
                                Colors.transparent,
                              ],
                            ),
                            borderRadius: BorderRadius.circular(2),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF6366F1).withOpacity(0.8),
                                blurRadius: 10,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // 4. Top Header with Back / Close Button & Title
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Material(
                    color: Colors.black.withOpacity(0.55),
                    borderRadius: BorderRadius.circular(14),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: const Icon(Icons.arrow_back_rounded,
                            color: Colors.white, size: 26),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Scan Visitor QR Pass',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 19,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                          ),
                        ),
                        Text(
                          'Align QR Code within the frame',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 5. Bottom Controls (Flashlight / Torch, Switch Camera, Manual Input)
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Flashlight & Camera Switch Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Flashlight Toggle
                        _buildCircleControl(
                          icon: _isTorchOn
                              ? Icons.flash_on_rounded
                              : Icons.flash_off_rounded,
                          label: _isTorchOn ? 'Torch On' : 'Torch Off',
                          isActive: _isTorchOn,
                          onTap: () async {
                            await _controller.toggleTorch();
                            setState(() => _isTorchOn = !_isTorchOn);
                          },
                        ),
                        const SizedBox(width: 28),
                        // Camera Switch (Front/Back)
                        _buildCircleControl(
                          icon: Icons.flip_camera_android_rounded,
                          label: 'Flip Cam',
                          isActive: false,
                          onTap: () async {
                            await _controller.switchCamera();
                          },
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Fallback: Enter Pass Code Manually
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white.withOpacity(0.18),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: const BorderSide(color: Colors.white30),
                          ),
                        ),
                        icon: const Icon(Icons.pin_rounded, size: 20),
                        label: const Text(
                          'ENTER 6-DIGIT CODE MANUALLY',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCircleControl({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Material(
          color: isActive ? AppColors.primary : Colors.white.withOpacity(0.2),
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: Container(
              width: 58,
              height: 58,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isActive ? Colors.white : Colors.white30,
                  width: 1.5,
                ),
              ),
              child: Icon(icon, color: Colors.white, size: 26),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

/// Custom painter for glowing corner brackets on scanner viewfinder
class _ScannerBorderPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const strokeWidth = 4.0;
    const cornerLength = 34.0;
    const radius = 18.0;

    final paint = Paint()
      ..color = const Color(0xFF6366F1)
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final glowPaint = Paint()
      ..color = const Color(0xFF6366F1).withOpacity(0.5)
      ..strokeWidth = strokeWidth + 2.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    void drawCorner(double startX, double startY, double dx1, double dy1,
        double dx2, double dy2) {
      final path = Path()
        ..moveTo(startX + dx1 * cornerLength, startY)
        ..lineTo(startX + dx1 * radius, startY)
        ..quadraticBezierTo(startX, startY, startX, startY + dy2 * radius)
        ..lineTo(startX, startY + dy2 * cornerLength);

      canvas.drawPath(path, glowPaint);
      canvas.drawPath(path, paint);
    }

    // Top-Left
    drawCorner(0, 0, 1, 0, 0, 1);
    // Top-Right
    drawCorner(size.width, 0, -1, 0, 0, 1);
    // Bottom-Left
    drawCorner(0, size.height, 1, 0, 0, -1);
    // Bottom-Right
    drawCorner(size.width, size.height, -1, 0, 0, -1);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
