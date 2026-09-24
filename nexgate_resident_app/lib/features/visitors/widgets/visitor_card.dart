import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/constants/app_typography.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/utils/haptic_helper.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/visitor_model.dart';
import '../../../services/api_service.dart';
import '../visitor_detail_screen.dart';

/// Reusable Visitor Card for listings and activity feeds.
class VisitorCard extends StatelessWidget {
  final VisitorModel visitor;
  final VoidCallback? onDecisionUpdated;

  const VisitorCard({
    super.key,
    required this.visitor,
    this.onDecisionUpdated,
  });

  @override
  Widget build(BuildContext context) {
    final photoUrl = ApiService.getSecurePhotoUrl(visitor.photoUrl);

    return InkWell(
      onTap: () {
        HapticHelper.lightImpact();
        Navigator.of(context)
            .push(
          MaterialPageRoute(
            builder: (_) => VisitorDetailScreen(visitorId: visitor.id),
          ),
        )
            .then((_) {
          if (onDecisionUpdated != null) {
            onDecisionUpdated!();
          }
        });
      },
      borderRadius: AppDimensions.roundedLarge,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: AppDimensions.roundedLarge,
          border: Border.all(color: AppColors.border),
          boxShadow: AppDimensions.subtleShadow,
        ),
        child: Row(
          children: [
            // Visitor Photo / Avatar
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.lightBlue,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(11),
                child: photoUrl.isNotEmpty
                    ? Image.network(
                        photoUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (ctx, err, stack) => Center(
                          child: Text(
                            visitor.name.isNotEmpty ? visitor.name[0].toUpperCase() : 'V',
                            style: AppTypography.titleMedium.copyWith(
                              color: AppColors.primaryBlue,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      )
                    : Center(
                        child: Text(
                          visitor.name.isNotEmpty ? visitor.name[0].toUpperCase() : 'V',
                          style: AppTypography.titleMedium.copyWith(
                            color: AppColors.primaryBlue,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
              ),
            ),

            const SizedBox(width: 12),

            // Visitor Information
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          visitor.name,
                          style: AppTypography.titleSmall.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      StatusBadge.fromStatus(visitor.status),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        visitor.purpose.toUpperCase(),
                        style: AppTypography.caption.copyWith(
                          color: AppColors.primaryBlue,
                          fontWeight: FontWeight.w700,
                          fontSize: 10,
                        ),
                      ),
                      if (visitor.deliveryCompany != null &&
                          visitor.deliveryCompany!.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Text(
                          '• ${visitor.deliveryCompany!}',
                          style: AppTypography.caption.copyWith(
                            color: AppColors.secondaryText,
                          ),
                        ),
                      ],
                      const Spacer(),
                      Text(
                        DateFormatter.formatRelative(visitor.requestedAt),
                        style: AppTypography.caption.copyWith(
                          color: AppColors.mutedText,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
