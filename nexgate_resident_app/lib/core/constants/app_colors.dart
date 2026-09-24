import 'package:flutter/material.dart';

/// Centralized NexGate Design System Color Tokens.
/// Follows the sophisticated Blue, Purple, and Neutral Slate palette.
class AppColors {
  AppColors._();

  // Primary Brand Colors
  static const Color primaryBlue = Color(0xFF2563EB);
  static const Color deepBlue = Color(0xFF1D4ED8);
  static const Color lightBlue = Color(0xFFEFF6FF);

  // Purple Accent Brand Colors
  static const Color primaryPurple = Color(0xFF6366F1);
  static const Color deepPurple = Color(0xFF4F46E5);
  static const Color lightPurple = Color(0xFFEEF2FF);

  // Background & Surfaces
  static const Color mainBackground = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color cardSurface = Color(0xFFFFFFFF);
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);

  // Typography & Text
  static const Color primaryText = Color(0xFF0F172A);
  static const Color secondaryText = Color(0xFF64748B);
  static const Color mutedText = Color(0xFF94A3B8);
  static const Color whiteText = Color(0xFFFFFFFF);

  // Borders & Dividers
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderLight = Color(0xFFF1F5F9);
  static const Color divider = Color(0xFFE2E8F0);

  // Semantic Status Colors
  static const Color success = Color(0xFF16A34A);
  static const Color successBackground = Color(0xFFF0FDF4);
  static const Color successBorder = Color(0xFFBBF7D0);

  static const Color warning = Color(0xFFD97706);
  static const Color warningBackground = Color(0xFFFFFBEB);
  static const Color warningBorder = Color(0xFFFDE68A);

  static const Color error = Color(0xFFDC2626);
  static const Color errorBackground = Color(0xFFFEF2F2);
  static const Color errorBorder = Color(0xFFFECACA);

  static const Color info = Color(0xFF0284C7);
  static const Color infoBackground = Color(0xFFF0F9FF);
  static const Color infoBorder = Color(0xFFBAE6FD);

  // Gradients
  static const LinearGradient brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primaryBlue, deepPurple],
  );

  static const LinearGradient splashGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [deepBlue, deepPurple, Color(0xFF312E81)],
  );

  static const LinearGradient accentCardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
  );

  static const LinearGradient successGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF16A34A), Color(0xFF0D9488)],
  );
}
