import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../tokens/hig_tokens.dart';

class HigScrollBehavior extends MaterialScrollBehavior {
  const HigScrollBehavior();

  @override
  ScrollPhysics getScrollPhysics(BuildContext context) =>
      const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics());
}

class PlayverzusTheme {
  PlayverzusTheme._();

  static ThemeData get darkTheme {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: HigColors.canvas,
      canvasColor: HigColors.canvas,
      cardColor: HigColors.surfacePrimary,
      dividerColor: HigColors.separator,
      primaryColor: HigColors.copper,
      splashFactory: NoSplash.splashFactory,
      highlightColor: Colors.white.withValues(alpha: 0.05),
      colorScheme: const ColorScheme.dark(
        primary: HigColors.copper,
        onPrimary: Colors.white,
        secondary: HigColors.emerald,
        onSecondary: Colors.black,
        error: HigColors.crimson,
        onError: Colors.white,
        surface: HigColors.surfacePrimary,
        onSurface: HigColors.labelPrimary,
        outline: HigColors.separator,
      ),
      cupertinoOverrideTheme: const CupertinoThemeData(
        brightness: Brightness.dark,
        primaryColor: HigColors.copper,
        scaffoldBackgroundColor: HigColors.canvas,
        barBackgroundColor: HigColors.glassFill,
      ),
      textTheme: base.textTheme.copyWith(
        displaySmall: HigTypography.largeTitle(),
        headlineMedium: HigTypography.title1(),
        headlineSmall: HigTypography.title2(),
        titleLarge: HigTypography.title3(),
        titleMedium: HigTypography.headline(),
        bodyLarge: HigTypography.body(),
        bodyMedium: HigTypography.subheadline(),
        bodySmall: HigTypography.footnote(),
        labelSmall: HigTypography.caption(),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        foregroundColor: HigColors.labelPrimary,
      ),
      dividerTheme: const DividerThemeData(
        color: HigColors.separator,
        thickness: 0.5,
        space: 1,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.windows: CupertinoPageTransitionsBuilder(),
          TargetPlatform.linux: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }
}
