import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';
import '../constants/app_typography.dart';
import '../utils/haptic_helper.dart';

/// Reusable secondary button (outlined or subtle tinted container).
class SecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final Color? borderColor;
  final Color? textColor;
  final Color? backgroundColor;
  final double? width;
  final double height;

  const SecondaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.borderColor,
    this.textColor,
    this.backgroundColor,
    this.width,
    this.height = AppDimensions.buttonHeight,
  });

  @override
  Widget build(BuildContext context) {
    final fgColor = textColor ?? AppColors.primaryText;
    final bColor = borderColor ?? AppColors.border;
    final bgColor = backgroundColor ?? Colors.white;

    return SizedBox(
      width: width ?? double.infinity,
      height: height,
      child: OutlinedButton(
        onPressed: isLoading || onPressed == null
            ? null
            : () {
                HapticHelper.lightImpact();
                onPressed!();
              },
        style: OutlinedButton.styleFrom(
          backgroundColor: bgColor,
          foregroundColor: fgColor,
          side: BorderSide(color: bColor, width: 1.2),
          shape: RoundedRectangleBorder(
            borderRadius: AppDimensions.roundedMedium,
          ),
          elevation: 0,
        ),
        child: isLoading
            ? SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2.0,
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
