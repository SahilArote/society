import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_typography.dart';
import '../../../models/visitor_model.dart';
import '../../visitors/widgets/visitor_card.dart';

/// Recent Gate Activity Section on Dashboard.
class RecentVisitorsSection extends StatelessWidget {
  final List<VisitorModel> visitors;
  final VoidCallback onViewAll;
  final VoidCallback onRefresh;

  const RecentVisitorsSection({
    super.key,
    required this.visitors,
    required this.onViewAll,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'RECENT GATE ACTIVITY',
              style: AppTypography.sectionHeader,
            ),
            InkWell(
              onTap: onViewAll,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4.0),
                child: Text(
                  'View All',
                  style: AppTypography.button.copyWith(
                    color: AppColors.primaryBlue,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        if (visitors.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            alignment: Alignment.center,
            child: Column(
              children: [
                const Icon(
                  Icons.history_rounded,
                  size: 28,
                  color: AppColors.mutedText,
                ),
                const SizedBox(height: 8),
                Text(
                  'No recent visitors',
                  style: AppTypography.bodySmall.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Visitor entries will appear here in real-time.',
                  style: AppTypography.caption,
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: visitors.length > 3 ? 3 : visitors.length,
            separatorBuilder: (ctx, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              return VisitorCard(
                visitor: visitors[index],
                onDecisionUpdated: onRefresh,
              );
            },
          ),
      ],
    );
  }
}
