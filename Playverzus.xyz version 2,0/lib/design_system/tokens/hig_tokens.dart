import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Playverzus Brand System fused with Apple iOS Human Interface Guidelines (HIG).
/// Authentic Brand Palette (matches apps/web/src/app/globals.css & official logo):
/// - Canvas: Deep Obsidian (#0B0C10)
/// - Brand Primary: Playverzus Electric Purple (#8B5CF6)
/// - Brand Accent: Amethyst Violet (#A855F7)
class HigColors {
  HigColors._();

  // Dark-First Layered Elevation Surfaces (Deep Obsidian)
  static const Color canvas = Color(0xFF0B0C10);
  static const Color surfacePrimary = Color(0xFF111319);
  static const Color surfaceGrouped = Color(0xFF161922);
  static const Color surfaceElevated = Color(0xFF1F232D);
  static const Color glassFill = Color(0xD90B0C10); // 85% translucent obsidian
  static const Color glassStrong = Color(0xEB111319); // 92% translucent modal

  // Crisp Structural Borders
  static const Color separator = Color(0xFF202430);
  static const Color glassBorder = Color(0x1CFFFFFF); // 11% crisp hairline
  static const Color glassBorderBright = Color(0x30FFFFFF);

  // Authentic Playverzus Brand Purple (Matches X-Y-Z Mark & globals.css)
  static const Color brand = Color(0xFF8B5CF6);
  static const Color brandBright = Color(0xFFA855F7);
  static const Color brandPressed = Color(0xFF7C3AED);

  // Backward-compatible semantic aliases pointing to authentic Brand Purple
  static const Color copper = brand;
  static const Color copperBright = brandBright;
  static const Color copperPressed = brandPressed;

  // iOS-Calibrated Functional Status Colors
  static const Color emerald = Color(0xFF22C55E); // Verified / Won / Positive
  static const Color crimson = Color(0xFFEF4444); // Destructive / Loss / Error
  static const Color amber = Color(0xFFF59E0B); // Warning / Pending
  static const Color indigo = Color(0xFF6366F1); // Practice / Secondary
  static const Color blue = Color(0xFF3B82F6); // Info

  // High-Contrast Typography
  static const Color labelPrimary = Color(0xFFF8FAFC);
  static const Color labelSecondary = Color(0xFF9CA3AF);
  static const Color labelTertiary = Color(0xFF6B7280);
}

class HigSpacing {
  HigSpacing._();

  static const double xxs = 4.0;
  static const double xs = 8.0;
  static const double sm = 12.0;
  static const double md = 16.0;
  static const double lg = 20.0;
  static const double xl = 24.0;
  static const double xxl = 32.0;

  // Apple HIG Uniform Interactive Heights & Hit Targets
  static const double minHitTarget = 44.0;
  static const double buttonSmall = 34.0;
  static const double buttonMedium = 44.0;
  static const double buttonLarge = 48.0;
  static const double inputHeight = 44.0;

  // Clean Continuous Corner Radii
  static const double radiusSm = 10.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 20.0;

  // Translucent Bar Blur Sigmas (only applied to chrome bars & modals)
  static const double blurStandard = 18.0;
  static const double blurHeavy = 24.0;
}

class HigTypography {
  HigTypography._();

  static TextStyle largeTitle({Color color = HigColors.labelPrimary}) =>
      GoogleFonts.inter(
        fontSize: 32,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.6,
        height: 1.12,
        color: color,
      );

  static TextStyle title1({Color color = HigColors.labelPrimary}) =>
      GoogleFonts.inter(
        fontSize: 25,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.4,
        height: 1.18,
        color: color,
      );

  static TextStyle title2({Color color = HigColors.labelPrimary}) =>
      GoogleFonts.inter(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
        height: 1.22,
        color: color,
      );

  static TextStyle title3({Color color = HigColors.labelPrimary}) =>
      GoogleFonts.inter(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
        height: 1.25,
        color: color,
      );

  static TextStyle headline({Color color = HigColors.labelPrimary}) =>
      GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.15,
        height: 1.3,
        color: color,
      );

  static TextStyle body({Color color = HigColors.labelPrimary}) =>
      GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        height: 1.45,
        color: color,
      );

  static TextStyle subheadline({Color color = HigColors.labelSecondary}) =>
      GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        height: 1.35,
        color: color,
      );

  static TextStyle footnote({Color color = HigColors.labelSecondary}) =>
      GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        height: 1.4,
        color: color,
      );

  static TextStyle caption({Color color = HigColors.labelTertiary}) =>
      GoogleFonts.inter(
        fontSize: 11.5,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.2,
        height: 1.3,
        color: color,
      );

  /// Tabular monospace figures for match scores, payouts, Elo & timers.
  static TextStyle mono({
    double size = 13.5,
    FontWeight weight = FontWeight.w600,
    Color color = HigColors.labelPrimary,
    double letterSpacing = 0.0,
  }) =>
      GoogleFonts.jetBrainsMono(
        fontSize: size,
        fontWeight: weight,
        letterSpacing: letterSpacing,
        color: color,
        fontFeatures: const [FontFeature.tabularFigures()],
      );
}
