import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/widgets/confirmation_dialog.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/secondary_button.dart';
import '../../models/invite_model.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../dashboard/main_navigation_shell.dart';

/// Shareable Digital Visitor Entry Pass with QR code.
class DigitalPassScreen extends StatefulWidget {
  final String passId;
  final String visitorName;
  final String purpose;
  final String date;
  final String time;
  final String? notes;
  final InviteModel? invite;

  const DigitalPassScreen({
    super.key,
    required this.passId,
    required this.visitorName,
    required this.purpose,
    required this.date,
    required this.time,
    this.notes,
    this.invite,
  });

  @override
  State<DigitalPassScreen> createState() => _DigitalPassScreenState();
}

class _DigitalPassScreenState extends State<DigitalPassScreen> {
  bool _isCancelling = false;
  late String _status;

  @override
  void initState() {
    super.initState();
    _status = widget.invite?.status ?? 'ACTIVE';
  }

  Future<void> _handleShare() async {
    final user = AuthService.currentUser.value;
    final flat = widget.invite?.flatNumber.isNotEmpty == true
        ? widget.invite!.flatNumber
        : (user?.flatNumber ?? 'Unit');
    final society = user?.societyName ?? 'Eco Residency Co-operative Housing Society Ltd';

    final text = '''
🎫 NexGate Visitor Entry Pass
--------------------------------
Pass Code: ${widget.passId}
Visitor: ${widget.visitorName}
Destination: Flat $flat, $society
Valid On: ${widget.date} at ${widget.time}
Purpose: ${widget.purpose.toUpperCase()}
${widget.notes != null && widget.notes!.isNotEmpty ? 'Notes: ${widget.notes}\n' : ''}
Please present this pass or show the QR code at the security gate for instant entry.
''';

    try {
      final qrData = 'NEXGATE-PASS:${widget.passId}:${widget.visitorName}:$flat:${widget.date}';
      final painter = QrPainter(
        data: qrData,
        version: QrVersions.auto,
        gapless: true,
        eyeStyle: const QrEyeStyle(
          eyeShape: QrEyeShape.square,
          color: AppColors.primaryBlue,
        ),
        dataModuleStyle: const QrDataModuleStyle(
          dataModuleShape: QrDataModuleShape.square,
          color: AppColors.primaryText,
        ),
      );

      final picData = await painter.toImageData(600, format: ui.ImageByteFormat.png);
      if (picData != null) {
        final tempDir = Directory.systemTemp;
        final tempFile = File('${tempDir.path}/nexgate_pass_${widget.passId}.png');
        await tempFile.writeAsBytes(picData.buffer.asUint8List());

        await SharePlus.instance.share(
          ShareParams(
            files: [XFile(tempFile.path)],
            text: text,
            subject: 'NexGate Entry Pass for ${widget.visitorName}',
          ),
        );
        return;
      }
    } catch (e) {
      debugPrint('[SHARE] QR image generation fallback to text-only: $e');
    }

    SharePlus.instance.share(
      ShareParams(
        text: text,
        subject: 'NexGate Entry Pass for ${widget.visitorName}',
      ),
    );
  }

  Future<void> _handleCancel() async {
    if (widget.invite == null) return;
    final confirmed = await ConfirmationDialog.show(
      context,
      title: 'Cancel Pass',
      message: 'Are you sure you want to cancel the entry pass for ${widget.visitorName}? This code will no longer be valid at the gate.',
      confirmLabel: 'Cancel Pass',
      isDestructive: true,
      icon: Icons.cancel_outlined,
    );

    if (confirmed == true) {
      setState(() => _isCancelling = true);
      try {
        final success = await ApiService.cancelInvite(widget.invite!.id);
        if (!mounted) return;
        if (success) {
          setState(() => _status = 'CANCELLED');
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Visitor pass cancelled successfully'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to cancel pass: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      } finally {
        if (mounted) {
          setState(() => _isCancelling = false);
        }
      }
    }
  }

  void _navigateToHome() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MainNavigationShell(initialTab: 0)),
      (route) => false,
    );
  }

  Color _getStatusColor() {
    switch (_status.toUpperCase()) {
      case 'ACTIVE':
        return AppColors.success;
      case 'USED':
        return AppColors.primaryBlue;
      case 'CANCELLED':
        return AppColors.error;
      case 'EXPIRED':
      default:
        return AppColors.secondaryText;
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;
    final flatDisplay = widget.invite?.flatNumber.isNotEmpty == true
        ? widget.invite!.flatNumber
        : (user?.flatNumber ?? 'Resident');

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (bool didPop, Object? result) {
        if (didPop) return;
        _navigateToHome();
      },
      child: Scaffold(
        backgroundColor: AppColors.mainBackground,
        appBar: CustomAppBar(
          title: 'Visitor Pass',
          showBack: true,
          onBack: _navigateToHome,
        ),
        body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            children: [
              // Digital Pass Card Container
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppDimensions.roundedLarge,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppDimensions.cardShadow,
                ),
                child: Column(
                  children: [
                    // Card Top Strip
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      decoration: const BoxDecoration(
                        gradient: AppColors.brandGradient,
                        borderRadius: BorderRadius.vertical(top: Radius.circular(15)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'NEXGATE PASS',
                                  style: AppTypography.caption.copyWith(
                                    color: Colors.white.withValues(alpha: 0.8),
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  user?.societyName ?? 'Eco Residency Co-operative Housing Society Ltd',
                                  style: AppTypography.titleSmall.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'Flat $flatDisplay',
                              style: AppTypography.caption.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Status Badge Strip
                    Padding(
                      padding: const EdgeInsets.only(top: 14.0),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getStatusColor().withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: _getStatusColor().withValues(alpha: 0.4)),
                        ),
                        child: Text(
                          _status.toUpperCase(),
                          style: TextStyle(
                            color: _getStatusColor(),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
                    ),

                    // QR Code Area
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 18.0),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                          boxShadow: AppDimensions.subtleShadow,
                        ),
                        child: QrImageView(
                          data: 'NEXGATE-PASS:${widget.passId}:${widget.visitorName}:$flatDisplay:${widget.date}',
                          version: QrVersions.auto,
                          size: 160.0,
                          eyeStyle: const QrEyeStyle(
                            eyeShape: QrEyeShape.square,
                            color: AppColors.primaryBlue,
                          ),
                          dataModuleStyle: const QrDataModuleStyle(
                            dataModuleShape: QrDataModuleShape.square,
                            color: AppColors.primaryText,
                          ),
                        ),
                      ),
                    ),

                    // 6-digit Code Display
                    Text(
                      'ENTRY PASS CODE',
                      style: AppTypography.caption.copyWith(
                        color: AppColors.secondaryText,
                        letterSpacing: 1.2,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.passId,
                      style: AppTypography.displayMedium.copyWith(
                        color: AppColors.primaryBlue,
                        letterSpacing: 3.0,
                        fontWeight: FontWeight.w900,
                      ),
                    ),

                    const SizedBox(height: 18),

                    // Dashed Divider simulation
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      height: 1,
                      color: AppColors.border,
                    ),

                    // Visitor Details Grid
                    Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        children: [
                          _buildPassRow('Guest Name', widget.visitorName),
                          const SizedBox(height: 12),
                          _buildPassRow('Purpose', widget.purpose.toUpperCase()),
                          const SizedBox(height: 12),
                          _buildPassRow('Valid Date', widget.date),
                          const SizedBox(height: 12),
                          _buildPassRow('Expected Time', widget.time),
                          if (widget.notes != null && widget.notes!.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            _buildPassRow('Instructions', widget.notes!),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Action Buttons
              PrimaryButton(
                label: 'Share Pass via WhatsApp',
                icon: Icons.share_rounded,
                onPressed: _handleShare,
              ),

              if (widget.invite != null && _status == 'ACTIVE') ...[
                const SizedBox(height: 12),
                SecondaryButton(
                  label: 'Cancel Pass',
                  isLoading: _isCancelling,
                  textColor: AppColors.error,
                  borderColor: AppColors.errorBorder,
                  backgroundColor: AppColors.errorBackground,
                  onPressed: _isCancelling ? null : _handleCancel,
                ),
              ],

              const SizedBox(height: 12),

              SecondaryButton(
                label: 'Done',
                onPressed: _navigateToHome,
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

  Widget _buildPassRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTypography.caption.copyWith(
            color: AppColors.secondaryText,
          ),
        ),
        Text(
          value,
          style: AppTypography.bodySmall.copyWith(
            fontWeight: FontWeight.w700,
            color: AppColors.primaryText,
          ),
        ),
      ],
    );
  }
}
