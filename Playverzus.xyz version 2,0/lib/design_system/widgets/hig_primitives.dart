import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/catalog/official_games.dart';
import '../../core/storage/app_state.dart';
import '../tokens/hig_tokens.dart';

/// Clean dark obsidian card surface with crisp border (zero expensive BackdropFilter passes).
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final bool blur;
  final Color? backgroundColor;
  final Color? borderColor;
  final VoidCallback? onTap;

  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = HigSpacing.radiusLg,
    this.blur = false,
    this.backgroundColor,
    this.borderColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: BorderSide(
        color: borderColor ?? HigColors.separator,
        width: 1,
      ),
    );

    final Widget content = Container(
      padding: padding,
      clipBehavior: Clip.antiAlias,
      decoration: ShapeDecoration(
        color: backgroundColor ?? HigColors.surfacePrimary,
        shape: shape,
      ),
      child: child,
    );

    if (onTap != null) {
      return MouseRegion(
        cursor: SystemMouseCursors.click,
        child: GestureDetector(
          onTap: () {
            HapticFeedback.selectionClick();
            onTap!();
          },
          child: content,
        ),
      );
    }
    return content;
  }
}

enum HigButtonSize { small, medium, large }

enum HigButtonVariant { primary, secondary, ghost, emerald, destructive }

/// Apple HIG Tactile Button with uniform heights (34 / 44 / 50pt), spring press & optional shimmer.
class HigButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final HigButtonSize size;
  final HigButtonVariant variant;
  final bool fullWidth;
  final bool loading;
  final bool shimmer;

  const HigButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.size = HigButtonSize.medium,
    this.variant = HigButtonVariant.primary,
    this.fullWidth = false,
    this.loading = false,
    this.shimmer = false,
  });

  @override
  State<HigButton> createState() => _HigButtonState();
}

class _HigButtonState extends State<HigButton> {
  bool _pressed = false;

  double get _height {
    switch (widget.size) {
      case HigButtonSize.small:
        return HigSpacing.buttonSmall;
      case HigButtonSize.medium:
        return HigSpacing.buttonMedium;
      case HigButtonSize.large:
        return HigSpacing.buttonLarge;
    }
  }

  double get _radius {
    switch (widget.size) {
      case HigButtonSize.small:
        return 10;
      case HigButtonSize.medium:
        return 12;
      case HigButtonSize.large:
        return 15;
    }
  }

  Color get _bgColor {
    switch (widget.variant) {
      case HigButtonVariant.primary:
        return HigColors.copper;
      case HigButtonVariant.emerald:
        return HigColors.emerald;
      case HigButtonVariant.destructive:
        return HigColors.crimson.withValues(alpha: 0.16);
      case HigButtonVariant.secondary:
        return HigColors.surfaceElevated;
      case HigButtonVariant.ghost:
        return Colors.transparent;
    }
  }

  Color get _fgColor {
    switch (widget.variant) {
      case HigButtonVariant.primary:
        return Colors.white;
      case HigButtonVariant.emerald:
        return Colors.black;
      case HigButtonVariant.destructive:
        return HigColors.crimson;
      case HigButtonVariant.secondary:
        return HigColors.labelPrimary;
      case HigButtonVariant.ghost:
        return HigColors.labelSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null && !widget.loading;
    final horizontalPad = widget.size == HigButtonSize.small
        ? 12.0
        : widget.size == HigButtonSize.large
            ? 24.0
            : 16.0;

    final inner = AnimatedScale(
      scale: _pressed ? 0.97 : 1.0,
      duration: const Duration(milliseconds: 110),
      curve: Curves.easeOutCubic,
      child: AnimatedOpacity(
        opacity: enabled ? 1.0 : 0.45,
        duration: const Duration(milliseconds: 150),
        child: Container(
          height: _height,
          constraints: const BoxConstraints(minWidth: HigSpacing.minHitTarget),
          padding: EdgeInsets.symmetric(horizontal: horizontalPad),
          decoration: ShapeDecoration(
            color: _bgColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(_radius),
              side: BorderSide(
                color: widget.variant == HigButtonVariant.secondary
                    ? HigColors.separator
                    : widget.variant == HigButtonVariant.destructive
                        ? HigColors.crimson.withValues(alpha: 0.4)
                        : Colors.transparent,
                width: 1,
              ),
            ),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Row(
                mainAxisSize:
                    widget.fullWidth ? MainAxisSize.max : MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (widget.loading) ...[
                    CupertinoActivityIndicator(radius: 8, color: _fgColor),
                    const SizedBox(width: 8),
                  ] else if (widget.icon != null) ...[
                    Icon(
                      widget.icon,
                      size: widget.size == HigButtonSize.small ? 14 : 16,
                      color: _fgColor,
                    ),
                    const SizedBox(width: 7),
                  ],
                  Flexible(
                    child: Text(
                      widget.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: HigTypography.headline(color: _fgColor).copyWith(
                        fontSize: widget.size == HigButtonSize.small
                            ? 12.5
                            : widget.size == HigButtonSize.large
                                ? 15
                                : 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    return MouseRegion(
      cursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
      child: GestureDetector(
        onTapDown: enabled ? (_) => setState(() => _pressed = true) : null,
        onTapUp: enabled ? (_) => setState(() => _pressed = false) : null,
        onTapCancel: enabled ? () => setState(() => _pressed = false) : null,
        onTap: enabled
            ? () {
                HapticFeedback.lightImpact();
                widget.onPressed!();
              }
            : null,
        child: widget.fullWidth
            ? SizedBox(width: double.infinity, child: inner)
            : inner,
      ),
    );
  }
}

/// Uniform 44pt Apple HIG Input Field
class HigTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String placeholder;
  final IconData? prefixIcon;
  final ValueChanged<String>? onChanged;
  final bool obscureText;
  final TextInputType? keyboardType;
  final bool autofocus;

  const HigTextField({
    super.key,
    this.controller,
    required this.placeholder,
    this.prefixIcon,
    this.onChanged,
    this.obscureText = false,
    this.keyboardType,
    this.autofocus = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: HigSpacing.inputHeight,
      child: CupertinoTextField(
        controller: controller,
        placeholder: placeholder,
        onChanged: onChanged,
        obscureText: obscureText,
        keyboardType: keyboardType,
        autofocus: autofocus,
        style: HigTypography.body(color: HigColors.labelPrimary)
            .copyWith(fontSize: 14.5),
        placeholderStyle: HigTypography.body(color: HigColors.labelTertiary)
            .copyWith(fontSize: 14),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        prefix: prefixIcon == null
            ? null
            : Padding(
                padding: const EdgeInsets.only(left: 12),
                child: Icon(prefixIcon, size: 17, color: HigColors.labelTertiary),
              ),
        decoration: BoxDecoration(
          color: HigColors.surfaceGrouped,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: HigColors.glassBorder, width: 0.75),
        ),
      ),
    );
  }
}

enum HigBadgeTone { copper, emerald, crimson, indigo, neutral }

class HigBadge extends StatelessWidget {
  final String label;
  final HigBadgeTone tone;
  final IconData? icon;

  const HigBadge({
    super.key,
    required this.label,
    this.tone = HigBadgeTone.neutral,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    Color border;
    switch (tone) {
      case HigBadgeTone.copper:
        bg = HigColors.copper.withValues(alpha: 0.16);
        fg = HigColors.copperBright;
        border = HigColors.copper.withValues(alpha: 0.35);
      case HigBadgeTone.emerald:
        bg = HigColors.emerald.withValues(alpha: 0.16);
        fg = HigColors.emerald;
        border = HigColors.emerald.withValues(alpha: 0.35);
      case HigBadgeTone.crimson:
        bg = HigColors.crimson.withValues(alpha: 0.16);
        fg = HigColors.crimson;
        border = HigColors.crimson.withValues(alpha: 0.35);
      case HigBadgeTone.indigo:
        bg = HigColors.indigo.withValues(alpha: 0.16);
        fg = HigColors.indigo;
        border = HigColors.indigo.withValues(alpha: 0.35);
      case HigBadgeTone.neutral:
        bg = HigColors.surfaceElevated;
        fg = HigColors.labelSecondary;
        border = HigColors.glassBorder;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: border, width: 0.6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 11.5, color: fg),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: HigTypography.mono(
                size: 10.5,
                weight: FontWeight.w700,
                color: fg,
                letterSpacing: 0.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Memory-optimized Official Game Poster / Banner Renderer with downsampled decode cache.
class GamePosterView extends StatelessWidget {
  final OfficialGame game;
  final bool useBanner;
  final double borderRadius;
  final BoxFit fit;
  final int? cacheWidth;

  const GamePosterView({
    super.key,
    required this.game,
    this.useBanner = false,
    this.borderRadius = 12,
    this.fit = BoxFit.cover,
    this.cacheWidth,
  });

  @override
  Widget build(BuildContext context) {
    final assetPath = useBanner ? game.bannerAsset : game.posterAsset;
    final netUrl = useBanner ? game.bannerNetworkUrl : game.posterNetworkUrl;
    final decodeWidth = cacheWidth ?? (useBanner ? 720 : 420);

    Widget fallback = Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: game.gradientColors,
        ),
      ),
      alignment: Alignment.center,
      child: const Icon(
        CupertinoIcons.game_controller_solid,
        color: Colors.white54,
        size: 28,
      ),
    );

    Widget img;
    if (assetPath != null) {
      img = Image.asset(
        assetPath,
        fit: fit,
        cacheWidth: decodeWidth,
        gaplessPlayback: true,
        filterQuality: FilterQuality.medium,
        errorBuilder: (_, __, ___) => fallback,
      );
    } else if (netUrl != null) {
      img = Image.network(
        netUrl,
        fit: fit,
        cacheWidth: decodeWidth,
        gaplessPlayback: true,
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return const ColoredBox(color: HigColors.surfaceGrouped);
        },
        errorBuilder: (_, __, ___) => fallback,
      );
    } else {
      img = fallback;
    }

    return RepaintBoundary(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: img,
      ),
    );
  }
}

/// Apple iOS Notification Banner Overlay (Frosted Glass — Kickoff, Goals, Halftime, Full Time)
class FrostedToastOverlay extends ConsumerWidget {
  const FrostedToastOverlay({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final toasts = ref.watch(toastProvider);
    if (toasts.isEmpty) return const SizedBox.shrink();

    return Positioned(
      top: MediaQuery.paddingOf(context).top + 12,
      left: 16,
      right: 16,
      child: IgnorePointer(
        ignoring: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: toasts.map((t) {
                final accent = switch (t.tone) {
                  ToastTone.success => HigColors.emerald,
                  ToastTone.matchEvent => HigColors.copper,
                  ToastTone.warning => HigColors.amber,
                  ToastTone.error => HigColors.crimson,
                  ToastTone.info => HigColors.blue,
                };
                final icon = switch (t.tone) {
                  ToastTone.success => CupertinoIcons.checkmark_seal_fill,
                  ToastTone.matchEvent => CupertinoIcons.sportscourt_fill,
                  ToastTone.warning => CupertinoIcons.exclamationmark_triangle_fill,
                  ToastTone.error => CupertinoIcons.xmark_octagon_fill,
                  ToastTone.info => CupertinoIcons.bell_fill,
                };

                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Dismissible(
                    key: ValueKey(t.id),
                    direction: DismissDirection.up,
                    onDismissed: (_) =>
                        ref.read(toastProvider.notifier).dismiss(t.id),
                    child: GlassCard(
                      blur: true,
                      radius: 18,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      backgroundColor: HigColors.glassStrong,
                      borderColor: accent.withValues(alpha: 0.45),
                      child: Row(
                        children: [
                          Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: accent.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(icon, size: 18, color: accent),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  t.title,
                                  style: HigTypography.headline().copyWith(
                                    fontSize: 14,
                                  ),
                                ),
                                if (t.body != null && t.body!.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    t.body!,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: HigTypography.footnote(),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          CupertinoButton(
                            padding: EdgeInsets.zero,
                            minimumSize: const Size(32, 32),
                            onPressed: () =>
                                ref.read(toastProvider.notifier).dismiss(t.id),
                            child: const Icon(
                              CupertinoIcons.xmark,
                              size: 14,
                              color: HigColors.labelTertiary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }
}

/// Crisp, lag-free segmented selector using subtle 90ms color crossfade
/// instead of sluggish sliding-thumb spring physics.
class HigSegmentedControl<T extends Object> extends StatelessWidget {
  final T groupValue;
  final Map<T, String> segments;
  final ValueChanged<T> onChanged;
  final Color activeColor;
  final Color activeTextColor;
  final Color backgroundColor;

  const HigSegmentedControl({
    super.key,
    required this.groupValue,
    required this.segments,
    required this.onChanged,
    this.activeColor = HigColors.brand,
    this.activeTextColor = Colors.white,
    this.backgroundColor = HigColors.surfacePrimary,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(11),
        border: Border.all(color: HigColors.separator, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.max,
        children: segments.entries.map((entry) {
          final selected = entry.key == groupValue;
          return Expanded(
            child: MouseRegion(
              cursor: SystemMouseCursors.click,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  if (!selected) {
                    HapticFeedback.selectionClick();
                    onChanged(entry.key);
                  }
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 90),
                  curve: Curves.easeOut,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: selected ? activeColor : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    entry.value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: HigTypography.footnote(
                      color: selected
                          ? activeTextColor
                          : HigColors.labelSecondary,
                    ).copyWith(
                      fontSize: 12.5,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

/// Clean Loading State Card
class HigLoadingCard extends StatelessWidget {
  final String message;
  const HigLoadingCard({super.key, this.message = 'Loading...'});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 14,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CupertinoActivityIndicator(radius: 10),
          const SizedBox(width: 12),
          Text(message, style: HigTypography.subheadline()),
        ],
      ),
    );
  }
}

/// Clean Inline Error Banner with Retry action
class HigErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  const HigErrorBanner({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 14,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      backgroundColor: HigColors.crimson.withValues(alpha: 0.08),
      borderColor: HigColors.crimson.withValues(alpha: 0.35),
      child: Row(
        children: [
          const Icon(
            CupertinoIcons.exclamationmark_circle_fill,
            color: HigColors.crimson,
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: HigTypography.footnote(color: HigColors.labelPrimary),
            ),
          ),
          if (onRetry != null) ...[
            const SizedBox(width: 10),
            HigButton(
              label: 'Retry',
              size: HigButtonSize.small,
              variant: HigButtonVariant.secondary,
              onPressed: onRetry,
            ),
          ],
        ],
      ),
    );
  }
}

/// Clean Honest Empty State Card
class HigEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const HigEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 16,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 28, color: HigColors.labelTertiary),
          const SizedBox(height: 12),
          Text(title, style: HigTypography.headline(), textAlign: TextAlign.center),
          const SizedBox(height: 6),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Text(
              subtitle,
              style: HigTypography.footnote(),
              textAlign: TextAlign.center,
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 16),
            HigButton(
              label: actionLabel!,
              size: HigButtonSize.small,
              onPressed: onAction,
            ),
          ],
        ],
      ),
    );
  }
}
