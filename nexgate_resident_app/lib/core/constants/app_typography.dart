import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Centralized NexGate Typography System.
/// Uses Inter font with clear visual hierarchy, line heights, and weights.
class AppTypography {
  AppTypography._();

  // Display Headings
  static TextStyle displayLarge = GoogleFonts.inter(
    fontSize: 28,
    fontWeight: FontWeight.w800,
    color: AppColors.primaryText,
    letterSpacing: -0.8,
    height: 1.2,
  );

  static TextStyle displayMedium = GoogleFonts.inter(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: AppColors.primaryText,
    letterSpacing: -0.5,
    height: 1.25,
  );

  // Screen & Card Headings
  static TextStyle titleLarge = GoogleFonts.inter(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: AppColors.primaryText,
    letterSpacing: -0.3,
    height: 1.3,
  );

  static TextStyle titleMedium = GoogleFonts.inter(
    fontSize: 17,
    fontWeight: FontWeight.w600,
    color: AppColors.primaryText,
    letterSpacing: -0.2,
    height: 1.3,
  );

  static TextStyle titleSmall = GoogleFonts.inter(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: AppColors.primaryText,
    letterSpacing: -0.1,
  );

  // Section Headers
  static TextStyle sectionHeader = GoogleFonts.inter(
    fontSize: 11,
    fontWeight: FontWeight.w700,
    color: AppColors.secondaryText,
    letterSpacing: 0.8,
    height: 1.4,
  );

  // Body Styles
  static TextStyle bodyLarge = GoogleFonts.inter(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    color: AppColors.primaryText,
    height: 1.45,
  );

  static TextStyle bodyMedium = GoogleFonts.inter(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    color: AppColors.primaryText,
    height: 1.4,
  );

  static TextStyle bodySmall = GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.secondaryText,
    height: 1.35,
  );

  // Captions & Metadata
  static TextStyle caption = GoogleFonts.inter(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    color: AppColors.mutedText,
    height: 1.3,
  );

  // Buttons & Badges
  static TextStyle button = GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
  );

  static TextStyle badge = GoogleFonts.inter(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
  );
}
