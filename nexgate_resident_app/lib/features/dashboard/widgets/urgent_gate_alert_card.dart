import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/constants/app_typography.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/secondary_button.dart';
import '../../../models/visitor_model.dart';
import '../../../services/api_service.dart';

/// Top high-priority gate arrival alert banner with fast 1-tap Allow/Deny.
class UrgentGateAlertCard extends StatelessWidget {
  final VisitorModel visitor;
  final VoidCallback onAllow;
  final VoidCallback onDeny;
  final VoidCallback onTapDetails;

  const UrgentGateAlertCard({
    super.key,
    required this.visitor,
    required this.onAllow,
    required this.onDeny,
    required this.onTapDetails,
  });

  @override
  Widget build(BuildContext context) {
    final photoUrl = ApiService.getSecurePhotoUrl(visitor.photoUrl);

    return InkWell(
      onTap: onTapDetails,
      borderRadius: AppDimensions.roundedLarge,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: AppDimensions.roundedLarge,
          border: Border.all(color: const Color(0xFFFED7AA), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.amber.withValues(alpha: 0.12),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            // Top Alert Header Strip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: const BoxDecoration(
                color: Color(0xFFFFFBEB),
                borderRadius: BorderRadius.vertical(top: Radius.circular(15)),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.doorbell_rounded,
                    size: 16,
                    color: AppColors.warning,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'VISITOR WAITING AT GATE',
                    style: AppTypography.caption.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.warning,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.warningBorder),
                    ),
                    child: Text(
                      visitor.gate,
                      style: AppTypography.caption.copyWith(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryText,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Visitor Info Section
            Padding(
              padding: const EdgeInsets.all(14.0),
              child: Row(
                children: [
                  // Visitor Avatar or Photo
                  Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      color: AppColors.lightBlue,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(13),
                      child: photoUrl.isNotEmpty
                          ? Image.network(
                              photoUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (ctx, err, stack) => const Icon(
                                Icons.person_rounded,
                                size: 30,
                                color: AppColors.primaryBlue,
                              ),
                            )
                          : const Icon(
                              Icons.person_rounded,
                              size: 30,
                              color: AppColors.primaryBlue,
                            ),
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Name, Purpose, Company
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          visitor.name,
                          style: AppTypography.titleMedium.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: AppColors.lightPurple,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                visitor.purpose.toUpperCase(),
                                style: AppTypography.caption.copyWith(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.deepPurple,
                                ),
                              ),
                            ),
                            if (visitor.deliveryCompany != null &&
                                visitor.deliveryCompany!.isNotEmpty) ...[
                              const SizedBox(width: 6),
                              Text(
                                visitor.deliveryCompany!,
                                style: AppTypography.caption.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.secondaryText,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Action Buttons (Allow / Deny)
            Padding(
              padding: const EdgeInsets.only(left: 14, right: 14, bottom: 14),
              child: Row(
                children: [
                  Expanded(
                    child: SecondaryButton(
                      label: 'Deny Entry',
                      height: 40,
                      borderColor: AppColors.errorBorder,
                      textColor: AppColors.error,
                      backgroundColor: AppColors.errorBackground,
                      onPressed: onDeny,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: PrimaryButton(
                      label: 'Allow Entry',
                      height: 40,
                      backgroundColor: AppColors.success,
                      icon: Icons.check_circle_rounded,
                      onPressed: onAllow,
                    ),
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
