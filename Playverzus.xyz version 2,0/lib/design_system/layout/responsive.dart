import 'package:flutter/material.dart';

/// 4-Tier Apple HIG Adaptive Breakpoint Engine across Phones, Tablets, Laptops & Monitors.
enum ScreenTier {
  compact, // < 600dp (iPhone, Android Phones)
  medium, // 600 - 1023dp (iPad Portrait, Foldables)
  expanded, // 1024 - 1439dp (iPad Landscape, Laptops)
  ultraWide, // >= 1440dp (Desktop & Gaming Monitors)
}

class Responsive {
  Responsive._();

  static ScreenTier tierOf(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < 600) return ScreenTier.compact;
    if (width < 1024) return ScreenTier.medium;
    if (width < 1440) return ScreenTier.expanded;
    return ScreenTier.ultraWide;
  }

  static bool isCompact(BuildContext context) =>
      tierOf(context) == ScreenTier.compact;

  static bool isMedium(BuildContext context) =>
      tierOf(context) == ScreenTier.medium;

  static bool isDesktopOrExpanded(BuildContext context) {
    final t = tierOf(context);
    return t == ScreenTier.expanded || t == ScreenTier.ultraWide;
  }

  static bool isUltraWide(BuildContext context) =>
      tierOf(context) == ScreenTier.ultraWide;

  static EdgeInsets pagePadding(BuildContext context) {
    switch (tierOf(context)) {
      case ScreenTier.compact:
        return const EdgeInsets.symmetric(horizontal: 16, vertical: 16);
      case ScreenTier.medium:
        return const EdgeInsets.symmetric(horizontal: 24, vertical: 20);
      case ScreenTier.expanded:
        return const EdgeInsets.symmetric(horizontal: 28, vertical: 24);
      case ScreenTier.ultraWide:
        return const EdgeInsets.symmetric(horizontal: 36, vertical: 28);
    }
  }

  static int posterGridColumns(BuildContext context) {
    switch (tierOf(context)) {
      case ScreenTier.compact:
        return 2;
      case ScreenTier.medium:
        return 3;
      case ScreenTier.expanded:
        return 4;
      case ScreenTier.ultraWide:
        return 5;
    }
  }

  static int cardGridColumns(BuildContext context) {
    switch (tierOf(context)) {
      case ScreenTier.compact:
        return 1;
      case ScreenTier.medium:
        return 2;
      case ScreenTier.expanded:
        return 3;
      case ScreenTier.ultraWide:
        return 3;
    }
  }
}

/// Centers content inside an ergonomic Apple HIG max-width reading/gaming column.
class HigMaxWidthContainer extends StatelessWidget {
  final Widget child;
  final double maxWidth;
  final EdgeInsetsGeometry? padding;

  const HigMaxWidthContainer({
    super.key,
    required this.child,
    this.maxWidth = 1320,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Padding(
          padding: padding ?? Responsive.pagePadding(context),
          child: child,
        ),
      ),
    );
  }
}
