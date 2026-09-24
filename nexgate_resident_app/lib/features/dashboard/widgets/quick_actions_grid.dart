import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_dimensions.dart';
import '../../../core/constants/app_typography.dart';
import '../../../core/utils/haptic_helper.dart';

class QuickActionItem {
  final String label;
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final VoidCallback onTap;

  const QuickActionItem({
    required this.label,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.onTap,
  });
}

/// 4-column quick action grid on Home Dashboard.
class QuickActionsGrid extends StatelessWidget {
  final VoidCallback onInviteVisitor;
  final VoidCallback onVisitors;
  final VoidCallback onFamily;
  final VoidCallback onVehicles;

  const QuickActionsGrid({
    super.key,
    required this.onInviteVisitor,
    required this.onVisitors,
    required this.onFamily,
    required this.onVehicles,
  });

  @override
  Widget build(BuildContext context) {
    final actions = [
      QuickActionItem(
        label: 'Invite',
        icon: Icons.person_add_alt_1_rounded,
        iconBg: AppColors.lightPurple,
        iconColor: AppColors.deepPurple,
        onTap: onInviteVisitor,
      ),
      QuickActionItem(
        label: 'Visitors',
        icon: Icons.people_alt_rounded,
        iconBg: AppColors.lightBlue,
        iconColor: AppColors.primaryBlue,
        onTap: onVisitors,
      ),
      QuickActionItem(
        label: 'Family',
        icon: Icons.family_restroom_rounded,
        iconBg: const Color(0xFFFCE7F3),
        iconColor: const Color(0xFFDB2777),
        onTap: onFamily,
      ),
      QuickActionItem(
        label: 'Vehicles',
        icon: Icons.directions_car_rounded,
        iconBg: const Color(0xFFFEF3C7),
        iconColor: const Color(0xFFD97706),
        onTap: onVehicles,
      ),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppDimensions.roundedLarge,
        border: Border.all(color: AppColors.border),
        boxShadow: AppDimensions.subtleShadow,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: actions.map((act) {
          return InkWell(
            onTap: () {
              HapticHelper.lightImpact();
              act.onTap();
            },
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: act.iconBg,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(act.icon, color: act.iconColor, size: 22),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    act.label,
                    style: AppTypography.caption.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryText,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
