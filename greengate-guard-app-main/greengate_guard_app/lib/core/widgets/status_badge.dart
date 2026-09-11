import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../../models/visitor_request.dart';

class StatusBadge extends StatelessWidget {
  final VisitorStatus status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    IconData icon;
    String label;

    switch (status) {
      case VisitorStatus.pending:
        bg = AppColors.warningLight;
        fg = AppColors.warningText;
        icon = Icons.access_time_filled;
        label = 'WAITING';
        break;
      case VisitorStatus.approved:
        bg = AppColors.successLight;
        fg = AppColors.successText;
        icon = Icons.check_circle;
        label = 'APPROVED';
        break;
      case VisitorStatus.rejected:
        bg = AppColors.errorLight;
        fg = AppColors.errorText;
        icon = Icons.cancel;
        label = 'REJECTED';
        break;
      case VisitorStatus.completed:
        bg = AppColors.primaryLight;
        fg = AppColors.primary;
        icon = Icons.done_all;
        label = 'COMPLETED';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: fg.withOpacity(0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fg),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: fg,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );
  }
}
