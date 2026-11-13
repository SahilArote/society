import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens for NexGate Guard Login Screen.
/// Optimized with balanced, medium-compact dimensions so that
/// the entire screen fits without any vertical scrolling.
class LoginTokens {
  LoginTokens._();

  // ===========================================================================
  // COLOR TOKENS
  // ===========================================================================
  static const Color bg = Color(0xFFF4F6FB);
  static const Color card = Color(0xFFFFFFFF);
  static const Color primary = Color(0xFF4F46E5);
  static const Color primaryDark = Color(0xFF4338CA);
  static const Color primaryTint = Color(0xFFEEF2FF);
  static const Color focusRing = Color(0xFFE0E7FF);
  static const Color ink = Color(0xFF0F172A);
  static const Color inputText = Color(0xFF1E1B4B);
  static const Color muted = Color(0xFF475569);
  static const Color footer = Color(0xFF64748B);
  static const Color borderField = Color(0xFFD5DAE6);
  static const Color borderSoft = Color(0xFFE3E7F0);
  static const Color divider = Color(0xFFE8EBF3);
  static const Color live = Color(0xFF10B981);
  static const Color error = Color(0xFFDC2626);

  // ===========================================================================
  // COMPACT & RESPONSIVE LAYOUT TOKENS (No-Scroll Viewport Budget: ~540px)
  // ===========================================================================
  static const double referenceWidth = 390.0;
  static const double screenPaddingTop = 8.0;
  static const double screenPaddingSides = 20.0;
  static const double screenPaddingBottom = 12.0;

  // 1. Live Cloud Chip
  static const double liveChipHeight = 32.0;
  static const double liveChipRadius = 16.0;
  static const double liveChipPaddingHorizontal = 12.0;
  static const double liveDotSize = 7.0;
  static const Color liveChipTextColor = Color(0xFF334155);

  // 2. Logo Tile
  static const double logoTileSize = 54.0;
  static const double logoTileRadius = 16.0;
  static const double logoMarginTop = 8.0;
  static const List<BoxShadow> logoShadow = [
    BoxShadow(
      color: Color.fromRGBO(79, 70, 229, 0.25),
      offset: Offset(0, 8),
      blurRadius: 16,
    ),
  ];

  // 3 & 4. Title & Subtitle Margins
  static const double titleMarginTop = 8.0;
  static const double subtitleMarginTop = 2.0;

  // 5. Card
  static const double cardMarginTop = 14.0;
  static const double cardRadius = 22.0;
  static const double cardPadding = 18.0;
  static const double cardSectionGap = 14.0;
  static const List<BoxShadow> cardShadow = [
    BoxShadow(
      color: Color.fromRGBO(15, 23, 42, 0.06),
      offset: Offset(0, 6),
      blurRadius: 24,
    ),
  ];

  // 5a. Mobile Field
  static const double fieldHeight = 48.0;
  static const double fieldRadius = 14.0;
  static const double fieldBorderWidth = 1.5;
  static const double fieldPaddingHorizontal = 14.0;
  static const double fieldGap = 10.0;
  static const double focusRingSpread = 3.0;

  // 5b. PIN Section
  static const double pinButtonHeight = 30.0;
  static const double pinButtonRadius = 10.0;
  static const double pinBoxWidth = 52.0;
  static const double pinBoxHeight = 52.0;
  static const double pinBoxRadius = 14.0;
  static const double pinBoxBorderWidth = 1.5;

  // 5c. Primary Button
  static const double buttonHeight = 48.0;
  static const double buttonRadius = 14.0;
  static const double buttonIconGap = 8.0;
  static const List<BoxShadow> buttonShadow = [
    BoxShadow(
      color: Color.fromRGBO(79, 70, 229, 0.25),
      offset: Offset(0, 6),
      blurRadius: 14,
    ),
  ];

  // 5d. Demo Section
  static const double demoDividerPaddingTop = 12.0;
  static const double demoRowGap = 8.0;
  static const double demoChipHeight = 42.0;
  static const double demoChipRadius = 12.0;
  static const double demoChipPaddingHorizontal = 10.0;
  static const double demoChipGap = 10.0;

  // 6. Footer
  static const double footerMarginTopMin = 10.0;

  // Accessibility Target Minimum
  static const double minTouchTarget = 44.0;

  // ===========================================================================
  // TYPOGRAPHY (Plus Jakarta Sans: 500, 600, 700, 800)
  // ===========================================================================
  static TextStyle font({
    required double size,
    required FontWeight weight,
    required Color color,
    double? letterSpacing,
    double? height,
  }) {
    return GoogleFonts.plusJakartaSans(
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );
  }
}
