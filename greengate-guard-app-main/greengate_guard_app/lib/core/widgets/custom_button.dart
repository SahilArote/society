import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';

enum CustomButtonVariant { primary, secondary, success, danger, outline }

class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;
  final CustomButtonVariant variant;
  final bool isLoading;
  final double height;

  const CustomButton({
    super.key,
    required this.text,
    this.onPressed,
    this.icon,
    this.variant = CustomButtonVariant.primary,
    this.isLoading = false,
    this.height = AppDimensions.buttonHeightPrimary, // 60px default for accessible touch targets
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    BorderSide border = BorderSide.none;

    switch (variant) {
      case CustomButtonVariant.primary:
        bg = AppColors.primary;
        fg = Colors.white;
        break;
      case CustomButtonVariant.secondary:
        bg = AppColors.surfaceLow;
        fg = AppColors.textPrimary;
        border = const BorderSide(color: AppColors.border, width: 1.5);
        break;
      case CustomButtonVariant.success:
        bg = AppColors.success;
        fg = Colors.white;
        break;
      case CustomButtonVariant.danger:
        bg = AppColors.error;
        fg = Colors.white;
        break;
      case CustomButtonVariant.outline:
        bg = AppColors.surface;
        fg = AppColors.textPrimary;
        border = const BorderSide(color: AppColors.border, width: 2.0);
        break;
    }

    return SizedBox(
      height: height,
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: fg,
          elevation: variant == CustomButtonVariant.outline ? 0 : 2,
          side: border,
          shape: RoundedRectangleBorder(
            borderRadius: AppDimensions.roundedLg,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20),
        ),
        onPressed: isLoading ? null : onPressed,
        child: isLoading
            ? SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 3.0,
                  valueColor: AlwaysStoppedAnimation<Color>(fg),
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 22, color: fg),
                    const SizedBox(width: 10),
                  ],
                  Flexible(
                    child: Text(
                      text,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: fg,
                        letterSpacing: 0.3,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
