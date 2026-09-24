import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/secondary_button.dart';
import '../../services/auth_service.dart';

/// Shareable Digital Visitor Entry Pass with QR code.
class DigitalPassScreen extends StatelessWidget {
  final String passId;
  final String visitorName;
  final String purpose;
  final String date;
  final String time;
  final String? notes;

  const DigitalPassScreen({
    super.key,
    required this.passId,
    required this.visitorName,
    required this.purpose,
    required this.date,
    required this.time,
    this.notes,
  });

  void _handleShare(BuildContext context) {
    final user = AuthService.currentUser.value;
    final flat = user?.flatNumber ?? 'Unit';
    final society = user?.societyName ?? 'Green Gate Residency';

    final text = '''
🎫 NexGate Visitor Entry Pass
--------------------------------
Pass Code: $passId
Visitor: $visitorName
Destination: Flat $flat, $society
Valid On: $date at $time
Purpose: ${purpose.toUpperCase()}
${notes != null && notes!.isNotEmpty ? 'Notes: $notes\n' : ''}
Please present this pass or show the QR code at the security gate for instant entry.
''';
    SharePlus.instance.share(
      ShareParams(
        text: text,
        subject: 'NexGate Entry Pass for $visitorName',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;

    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: const CustomAppBar(
        title: 'Visitor Pass Ready',
        showBack: true,
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
                          Column(
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
                                user?.societyName ?? 'Green Gate Residency',
                                style: AppTypography.titleSmall.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              user != null ? 'Flat ${user.flatNumber}' : 'Resident',
                              style: AppTypography.caption.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // QR Code Area
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24.0),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                          boxShadow: AppDimensions.subtleShadow,
                        ),
                        child: QrImageView(
                          data: 'NEXGATE-PASS:$passId:$visitorName:${user?.flatNumber}:$date',
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
                      passId,
                      style: AppTypography.displayMedium.copyWith(
                        color: AppColors.primaryBlue,
                        letterSpacing: 3.0,
                        fontWeight: FontWeight.w900,
                      ),
                    ),

                    const SizedBox(height: 20),

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
                          _buildPassRow('Guest Name', visitorName),
                          const SizedBox(height: 12),
                          _buildPassRow('Purpose', purpose.toUpperCase()),
                          const SizedBox(height: 12),
                          _buildPassRow('Valid Date', date),
                          const SizedBox(height: 12),
                          _buildPassRow('Expected Time', time),
                          if (notes != null && notes!.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            _buildPassRow('Instructions', notes!),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Action Buttons
              PrimaryButton(
                label: 'Share Pass via WhatsApp',
                icon: Icons.share_rounded,
                onPressed: () => _handleShare(context),
              ),

              const SizedBox(height: 12),

              SecondaryButton(
                label: 'Done',
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
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
