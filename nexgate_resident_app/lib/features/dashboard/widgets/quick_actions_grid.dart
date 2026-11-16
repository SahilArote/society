import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
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

/// Premium 4-action white rounded card matching reference design.
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
        icon: Icons.person_add_rounded,
        iconBg: const Color(0xFFEBF3FF),
        iconColor: const Color(0xFF155EEF),
        onTap: onInviteVisitor,
      ),
      QuickActionItem(
        label: 'Visitors',
        icon: Icons.groups_rounded,
        iconBg: const Color(0xFFEBF3FF),
        iconColor: const Color(0xFF155EEF),
        onTap: onVisitors,
      ),
      QuickActionItem(
        label: 'Family',
        icon: Icons.family_restroom_rounded,
        iconBg: const Color(0xFFF3E8FF), // Soft lavender
        iconColor: const Color(0xFF9333EA), // Purple
        onTap: onFamily,
      ),
      QuickActionItem(
        label: 'Vehicles',
        icon: Icons.directions_car_rounded,
        iconBg: const Color(0xFFEBF3FF),
        iconColor: const Color(0xFF155EEF),
        onTap: onVehicles,
      ),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.05),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          for (int i = 0; i < actions.length; i++) ...[
            Expanded(
              child: _buildActionItem(actions[i]),
            ),
            if (i < actions.length - 1)
              Container(
                width: 1,
                height: 38,
                color: const Color(0xFFF1F5F9),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionItem(QuickActionItem action) {
    return InkWell(
      onTap: () {
        HapticHelper.lightImpact();
        action.onTap();
      },
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: action.iconBg,
                shape: BoxShape.circle,
              ),
              child: Icon(
                action.icon,
                color: action.iconColor,
                size: 24,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              action.label,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: Color(0xFF0F172A),
                letterSpacing: -0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
