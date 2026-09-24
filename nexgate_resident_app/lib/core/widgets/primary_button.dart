import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';
import '../constants/app_typography.dart';
import '../utils/haptic_helper.dart';

/// Reusable primary CTA button with loading and icon support.
class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final double? width;
  final double height;
  final bool isDestructive;

  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.width,
    this.height = AppDimensions.buttonHeight,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = isDestructive
        ? AppColors.error
        : (backgroundColor ?? AppColors.primaryBlue);
    final fgColor = textColor ?? Colors.white;

    return SizedBox(
      width: width ?? double.infinity,
      height: height,
      child: ElevatedButton(
        onPressed: isLoading || onPressed == null
            ? null
            : () {
                HapticHelper.lightImpact();
                onPressed!();
              },
        style: ElevatedButton.styleFrom(
          backgroundColor: bgColor,
          foregroundColor: fgColor,
          disabledBackgroundColor: bgColor.withValues(alpha: 0.6),
          shape: RoundedRectangleBorder(
            borderRadius: AppDimensions.roundedMedium,
          ),
          elevation: 0,
        ),
        child: isLoading
            ? SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  valueColor: AlwaysStoppedAnimation<Color>(fgColor),
                ),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18, color: fgColor),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    label,
                    style: AppTypography.button.copyWith(color: fgColor),
                  ),
                ],
              ),
      ),
    );
  }
}
