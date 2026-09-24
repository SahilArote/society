import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_typography.dart';
import '../utils/haptic_helper.dart';

/// Context-aware modern App Bar for NexGate screens.
class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final String? subtitle;
  final bool showBack;
  final VoidCallback? onBack;
  final List<Widget>? actions;
  final bool isHome;
  final String? flatNumber;
  final String? societyName;

  const CustomAppBar({
    super.key,
    this.title,
    this.subtitle,
    this.showBack = false,
    this.onBack,
    this.actions,
    this.isHome = false,
    this.flatNumber,
    this.societyName,
  });

  @override
  Size get preferredSize => const Size.fromHeight(60.0);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: Row(
            children: [
              if (showBack) ...[
                InkWell(
                  onTap: () {
                    HapticHelper.lightImpact();
                    if (onBack != null) {
                      onBack!();
                    } else {
                      Navigator.maybePop(context);
                    }
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.mainBackground,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      size: 16,
                      color: AppColors.primaryText,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
              ] else if (isHome) ...[
                // NexGate Brand Logo Mark
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AppColors.lightBlue,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(9),
                    child: Image.asset(
                      'assets/images/logo.png',
                      fit: BoxFit.contain,
                      errorBuilder: (ctx, err, stack) => const Icon(
                        Icons.shield_rounded,
                        color: AppColors.primaryBlue,
                        size: 22,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
              ],

              // Title Area
              Expanded(
                child: isHome
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Row(
                            children: [
                              Text(
                                'NexGate',
                                style: AppTypography.titleMedium.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.primaryBlue,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.lightPurple,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  flatNumber ?? 'Resident',
                                  style: AppTypography.caption.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.deepPurple,
                                    fontSize: 10,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Text(
                            societyName ?? 'Green Gate Residency',
                            style: AppTypography.caption.copyWith(
                              color: AppColors.secondaryText,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (title != null)
                            Text(
                              title!,
                              style: AppTypography.titleMedium,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          if (subtitle != null)
                            Text(
                              subtitle!,
                              style: AppTypography.caption,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
              ),

              // Actions Area
              ...?actions,
            ],
          ),
        ),
      ),
    );
  }
}
