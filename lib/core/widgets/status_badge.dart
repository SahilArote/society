import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';
import '../constants/app_typography.dart';

enum BadgeType {
  pending,
  approved,
  rejected,
  entered,
  exited,
  active,
  inactive,
  info,
}

/// Reusable status badge with semantic color schemes.
class StatusBadge extends StatelessWidget {
  final String label;
  final BadgeType type;
  final IconData? icon;

  const StatusBadge({
    super.key,
    required this.label,
    this.type = BadgeType.info,
    this.icon,
  });

  factory StatusBadge.fromStatus(String? status) {
    final s = (status ?? 'pending').toLowerCase();
    switch (s) {
      case 'approved':
      case 'allowed':
      case 'active':
        return StatusBadge(label: 'Approved', type: BadgeType.approved);
      case 'rejected':
      case 'denied':
        return StatusBadge(label: 'Rejected', type: BadgeType.rejected);
      case 'entered':
      case 'inside':
        return StatusBadge(label: 'Inside', type: BadgeType.entered);
      case 'exited':
      case 'left':
        return StatusBadge(label: 'Exited', type: BadgeType.exited);
      case 'pending':
        return StatusBadge(label: 'Pending', type: BadgeType.pending);
      default:
        return StatusBadge(label: status ?? 'Unknown', type: BadgeType.info);
    }
  }

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    Color border;

    switch (type) {
      case BadgeType.approved:
      case BadgeType.active:
        bg = AppColors.successBackground;
        fg = AppColors.success;
        border = AppColors.successBorder;
        break;
      case BadgeType.rejected:
      case BadgeType.inactive:
        bg = AppColors.errorBackground;
        fg = AppColors.error;
        border = AppColors.errorBorder;
        break;
      case BadgeType.pending:
        bg = AppColors.warningBackground;
        fg = AppColors.warning;
        border = AppColors.warningBorder;
        break;
      case BadgeType.entered:
        bg = AppColors.lightPurple;
        fg = AppColors.deepPurple;
        border = const Color(0xFFC7D2FE);
        break;
      case BadgeType.exited:
        bg = const Color(0xFFF1F5F9);
        fg = AppColors.secondaryText;
        border = AppColors.border;
        break;
      case BadgeType.info:
        bg = AppColors.infoBackground;
        fg = AppColors.info;
        border = AppColors.infoBorder;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppDimensions.roundedSmall,
        border: Border.all(color: border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: AppTypography.badge.copyWith(color: fg),
          ),
        ],
      ),
    );
  }
}
