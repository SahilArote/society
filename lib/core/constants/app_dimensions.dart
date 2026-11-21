import 'package:flutter/material.dart';

/// Centralized Spacing, Radius, and Elevation scale for NexGate.
class AppDimensions {
  AppDimensions._();

  // Spacing Scale
  static const double space2 = 2.0;
  static const double space4 = 4.0;
  static const double space8 = 8.0;
  static const double space12 = 12.0;
  static const double space16 = 16.0;
  static const double space20 = 20.0;
  static const double space24 = 24.0;
  static const double space32 = 32.0;
  static const double space40 = 40.0;
  static const double space48 = 48.0;

  // Corner Radii
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0;
  static const double radiusExtraLarge = 24.0;
  static const double radiusPill = 999.0;

  static final BorderRadius roundedSmall = BorderRadius.circular(radiusSmall);
  static final BorderRadius roundedMedium = BorderRadius.circular(radiusMedium);
  static final BorderRadius roundedLarge = BorderRadius.circular(radiusLarge);
  static final BorderRadius roundedExtraLarge = BorderRadius.circular(radiusExtraLarge);
  static final BorderRadius roundedPill = BorderRadius.circular(radiusPill);

  // Component Heights
  static const double buttonHeight = 48.0;
  static const double buttonHeightSm = 38.0;
  static const double inputHeight = 50.0;
  static const double appBarHeight = 56.0;
  static const double bottomNavHeight = 65.0;

  // Standard Screen Margins
  static const EdgeInsets screenPadding = EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0);
  static const EdgeInsets cardPadding = EdgeInsets.all(16.0);
  static const EdgeInsets modalPadding = EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0);

  // Shadows
  static const List<BoxShadow> subtleShadow = [
    BoxShadow(
      color: Color(0x0A0F172A),
      blurRadius: 8.0,
      offset: Offset(0, 2),
    ),
  ];

  static const List<BoxShadow> cardShadow = [
    BoxShadow(
      color: Color(0x080F172A),
      blurRadius: 12.0,
      spreadRadius: 0,
      offset: Offset(0, 4),
    ),
  ];

  static const List<BoxShadow> elevatedShadow = [
    BoxShadow(
      color: Color(0x120F172A),
      blurRadius: 20.0,
      spreadRadius: 0,
      offset: Offset(0, 8),
    ),
  ];
}
