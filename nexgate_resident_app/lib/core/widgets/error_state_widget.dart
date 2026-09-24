import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';
import '../constants/app_typography.dart';
import 'primary_button.dart';

/// Reusable retryable Error State display.
class ErrorStateWidget extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback? onRetry;
  final String retryLabel;

  const ErrorStateWidget({
    super.key,
    this.title = 'Something went wrong',
    required this.message,
    this.onRetry,
    this.retryLabel = 'Try Again',
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.errorBackground,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.errorBorder, width: 2),
              ),
              child: const Icon(
                Icons.error_outline_rounded,
                size: 32,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: AppTypography.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              message,
              style: AppTypography.bodySmall,
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 20),
              PrimaryButton(
                label: retryLabel,
                onPressed: onRetry,
                width: 150,
                height: AppDimensions.buttonHeightSm,
                icon: Icons.refresh_rounded,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
