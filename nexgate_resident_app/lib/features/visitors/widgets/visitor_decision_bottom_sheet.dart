import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/constants/app_typography.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/secondary_button.dart';
import '../../../models/visitor_model.dart';
import '../../../services/api_service.dart';

/// Instant Decision Bottom Sheet displayed when a visitor arrives at the gate.
class VisitorDecisionBottomSheet extends StatefulWidget {
  final VisitorModel visitor;
  final VoidCallback onAllow;
  final Function(String reason) onDeny;

  const VisitorDecisionBottomSheet({
    super.key,
    required this.visitor,
    required this.onAllow,
    required this.onDeny,
  });

  static Future<void> show(
    BuildContext context, {
    required VisitorModel visitor,
    required VoidCallback onAllow,
    required Function(String reason) onDeny,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => VisitorDecisionBottomSheet(
        visitor: visitor,
        onAllow: onAllow,
        onDeny: onDeny,
      ),
    );
  }

  @override
  State<VisitorDecisionBottomSheet> createState() =>
      _VisitorDecisionBottomSheetState();
}

class _VisitorDecisionBottomSheetState extends State<VisitorDecisionBottomSheet> {
  bool _isProcessing = false;

  @override
  Widget build(BuildContext context) {
    final photoUrl = ApiService.getSecurePhotoUrl(widget.visitor.photoUrl);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Top Gate Tag
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.warningBackground,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.warningBorder),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.doorbell_rounded, size: 14, color: AppColors.warning),
                  const SizedBox(width: 6),
                  Text(
                    'ARRIVED AT ${widget.visitor.gate.toUpperCase()}',
                    style: AppTypography.caption.copyWith(
                      color: AppColors.warning,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Large Visitor Photo Preview
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.lightBlue,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.border, width: 2),
                boxShadow: AppDimensions.cardShadow,
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(22),
                child: photoUrl.isNotEmpty
                    ? Image.network(
                        photoUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (ctx, err, stack) => const Icon(
                          Icons.person_rounded,
                          size: 48,
                          color: AppColors.primaryBlue,
                        ),
                      )
                    : const Icon(
                        Icons.person_rounded,
                        size: 48,
                        color: AppColors.primaryBlue,
                      ),
              ),
            ),

            const SizedBox(height: 16),

            // Name & Purpose
            Text(
              widget.visitor.name,
              style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.w800),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.lightPurple,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    widget.visitor.purpose.toUpperCase(),
                    style: AppTypography.caption.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.deepPurple,
                    ),
                  ),
                ),
                if (widget.visitor.deliveryCompany != null &&
                    widget.visitor.deliveryCompany!.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Text(
                    widget.visitor.deliveryCompany!,
                    style: AppTypography.bodySmall.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.secondaryText,
                    ),
                  ),
                ],
              ],
            ),

            const SizedBox(height: 16),

            // Flat & Timestamp Info Strip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.mainBackground,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      Text('Unit', style: AppTypography.caption),
                      const SizedBox(height: 2),
                      Text(
                        widget.visitor.flatNumber.isNotEmpty
                            ? widget.visitor.flatNumber
                            : 'Flat',
                        style: AppTypography.bodySmall.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  Container(width: 1, height: 24, color: AppColors.border),
                  Column(
                    children: [
                      Text('Time', style: AppTypography.caption),
                      const SizedBox(height: 2),
                      Text(
                        DateFormatter.formatTime(widget.visitor.requestedAt),
                        style: AppTypography.bodySmall.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  if (widget.visitor.vehicleNumber != null &&
                      widget.visitor.vehicleNumber!.isNotEmpty) ...[
                    Container(width: 1, height: 24, color: AppColors.border),
                    Column(
                      children: [
                        Text('Vehicle', style: AppTypography.caption),
                        const SizedBox(height: 2),
                        Text(
                          widget.visitor.vehicleNumber!,
                          style: AppTypography.bodySmall.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 28),

            // Decision Buttons
            Row(
              children: [
                Expanded(
                  child: SecondaryButton(
                    label: 'Deny Entry',
                    isLoading: _isProcessing,
                    borderColor: AppColors.errorBorder,
                    textColor: AppColors.error,
                    backgroundColor: AppColors.errorBackground,
                    onPressed: () {
                      setState(() => _isProcessing = true);
                      Navigator.of(context).pop();
                      widget.onDeny('Denied by resident');
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: PrimaryButton(
                    label: 'Allow Entry',
                    isLoading: _isProcessing,
                    backgroundColor: AppColors.success,
                    icon: Icons.check_circle_rounded,
                    onPressed: () {
                      setState(() => _isProcessing = true);
                      Navigator.of(context).pop();
                      widget.onAllow();
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
