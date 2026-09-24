import 'package:flutter/material.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/constants/app_typography.dart';

/// Security & Gate Status Overview widget.
class SecurityStatusCard extends StatelessWidget {
  final String gateName;
  final String guardName;
  final String statusText;

  const SecurityStatusCard({
    super.key,
    this.gateName = 'Main Gate',
    this.guardName = 'Security Team',
    this.statusText = 'Active Monitoring',
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A), // Dark slate premium card
        borderRadius: AppDimensions.roundedLarge,
        boxShadow: AppDimensions.cardShadow,
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
            ),
            child: const Icon(
              Icons.shield_outlined,
              color: Color(0xFF38BDF8),
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: Color(0xFF4ADE80),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      statusText.toUpperCase(),
                      style: AppTypography.caption.copyWith(
                        color: const Color(0xFF4ADE80),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '$gateName • $guardName',
                  style: AppTypography.bodyMedium.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  '24/7 Digital Gate Surveillance Active',
                  style: AppTypography.caption.copyWith(
                    color: const Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
