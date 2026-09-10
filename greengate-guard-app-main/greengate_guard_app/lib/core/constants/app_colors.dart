import 'package:flutter/material.dart';

class AppColors {
  // Primary (Deep Indigo / Purple for high outdoor contrast)
  static const Color primary = Color(0xFF4338CA);
  static const Color primaryDark = Color(0xFF312E81);
  static const Color primaryLight = Color(0xFFEEF2FF);
  static const Color primaryContainer = Color(0xFFE0E7FF);

  // Success / Approved (High Contrast Emerald Green)
  static const Color success = Color(0xFF059669);
  static const Color successDark = Color(0xFF047857);
  static const Color successLight = Color(0xFFD1FAE5);
  static const Color successText = Color(0xFF064E3B);

  // Destructive / Rejected (High Contrast Red)
  static const Color error = Color(0xFFDC2626);
  static const Color errorDark = Color(0xFFB91C1C);
  static const Color errorLight = Color(0xFFFEE2E2);
  static const Color errorText = Color(0xFF7F1D1D);

  // Warning / Pending (Amber)
  static const Color warning = Color(0xFFD97706);
  static const Color warningDark = Color(0xFFB45309);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color warningText = Color(0xFF78350F);

  // Neutral Background & Surfaces
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceLow = Color(0xFFF1F5F9);
  static const Color surfaceHigh = Color(0xFFE2E8F0);

  // High-Contrast Typography (Readable in direct sunlight)
  static const Color textPrimary = Color(0xFF0F172A); // Very dark slate black
  static const Color textSecondary = Color(0xFF334155); // High-contrast slate
  static const Color textMuted = Color(0xFF64748B); // Readable medium slate
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  // Crisp High-Contrast Borders (Prevents washed-out cards in sunlight)
  static const Color border = Color(0xFFCBD5E1);
  static const Color borderLight = Color(0xFFE2E8F0);
}
