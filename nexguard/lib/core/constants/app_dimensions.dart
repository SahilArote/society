import 'package:flutter/material.dart';

class AppDimensions {
  // Border Radii Scale
  static const double r13 = 13.0;
  static const double r14 = 14.0;
  static const double r16 = 16.0;
  static const double r18 = 18.0;
  static const double r20 = 20.0;
  static const double r28 = 28.0;

  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 20.0;
  static const double radiusFull = 999.0;

  static const BorderRadius rounded13 = BorderRadius.all(Radius.circular(13.0));
  static const BorderRadius rounded14 = BorderRadius.all(Radius.circular(14.0));
  static const BorderRadius rounded16 = BorderRadius.all(Radius.circular(16.0));
  static const BorderRadius rounded18 = BorderRadius.all(Radius.circular(18.0));
  static const BorderRadius rounded20 = BorderRadius.all(Radius.circular(20.0));
  static const BorderRadius rounded28 = BorderRadius.all(Radius.circular(28.0));
  static const BorderRadius roundedHeroBottom =
      BorderRadius.vertical(bottom: Radius.circular(28.0));

  static const BorderRadius roundedSm =
      BorderRadius.all(Radius.circular(radiusSm));
  static const BorderRadius roundedMd =
      BorderRadius.all(Radius.circular(radiusMd));
  static const BorderRadius roundedLg =
      BorderRadius.all(Radius.circular(radiusLg));
  static const BorderRadius roundedXl =
      BorderRadius.all(Radius.circular(radiusXl));
  static const BorderRadius roundedFull =
      BorderRadius.all(Radius.circular(radiusFull));

  // Spacing & Padding Scale (4/8/12/16)
  static const double p4 = 4.0;
  static const double p8 = 8.0;
  static const double p10 = 10.0;
  static const double p12 = 12.0;
  static const double p14 = 14.0;
  static const double p16 = 16.0;
  static const double p20 = 20.0;
  static const double p22 = 22.0;
  static const double p24 = 24.0;
  static const double p32 = 32.0;
  static const double p56 = 56.0;

  // Accessible Touch Target Heights (at least 44px)
  static const double buttonHeightPrimary = 56.0;
  static const double buttonHeightSecondary = 52.0;
  static const double touchTargetMin = 44.0;
  static const double navBarHeight = 72.0;

  // Elevation Shadows with Crisp Borders
  static const List<BoxShadow> statsCardShadow = [
    BoxShadow(
      color: Color.fromRGBO(30, 35, 90, 0.14),
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];

  static const List<BoxShadow> cardShadow = [
    BoxShadow(
      color: Color.fromRGBO(15, 23, 42, 0.06),
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ];
}