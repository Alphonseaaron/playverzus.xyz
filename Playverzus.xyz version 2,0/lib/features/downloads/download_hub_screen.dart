import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/brand_logo.dart';
import '../../design_system/widgets/hig_primitives.dart';

/// Dedicated Native App & Direct Android APK Download Hub (`/download`).
/// Surfaced prominently on Flutter Web (`kIsWeb`) so players on Android, Windows,
/// macOS & iOS can grab the native client for auto-detected installed games and
/// zero-prompt background verification.
class DownloadHubScreen extends ConsumerWidget {
  const DownloadHubScreen({super.key});

  Future<void> _launchDownload(
    WidgetRef ref,
    String url,
    String label,
  ) async {
    final uri = Uri.parse(url);
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      ref.read(toastProvider.notifier).show(
            'Download Started',
            body: 'Fetching $label (v${AppConfig.appVersion})...',
            tone: ToastTone.success,
          );
    } catch (_) {
      ref.read(toastProvider.notifier).show(
            'Release Package Ready',
            body: 'Host your compiled binary at $url to serve instant downloads.',
            tone: ToastTone.info,
          );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAndroidVisitor = defaultTargetPlatform == TargetPlatform.android;
    final isWindowsVisitor = defaultTargetPlatform == TargetPlatform.windows;

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Card with Official Playverzus Logo
              GlassCard(
                radius: 22,
                padding: const EdgeInsets.all(24),
                backgroundColor: HigColors.surfacePrimary,
                borderColor: HigColors.emerald.withValues(alpha: 0.35),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        const BrandLogo.full(height: 26),
                        const HigBadge(
                          label: 'VERSION ${AppConfig.appVersion}',
                          tone: HigBadgeTone.emerald,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Download Playverzus Native Apps & APK',
                      style: HigTypography.title1(),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Install once on Android or Desktop to automatically detect your installed games, eliminate screen-share confusion, and keep live score tracking active while heavy 3D games run.',
                      style: HigTypography.body(color: HigColors.labelSecondary),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 22),

              // Platform Download Cards (Intrinsic height — zero overflow at any width)
              LayoutBuilder(
                builder: (context, constraints) {
                  final twoCol = constraints.maxWidth >= 780;
                  final cards = [
                    _PlatformDownloadCard(
                      title: 'Android Direct APK',
                      subtitle: 'Android 10+ · Direct Signed Release (.apk)',
                      icon: CupertinoIcons.device_phone_portrait,
                      accent: HigColors.emerald,
                      recommended: isAndroidVisitor || kIsWeb,
                      bullets: const [
                        'Auto-detects installed mobile games (FC Mobile, PUBG Mobile, MLBB, eFootball, 8 Ball Pool)',
                        'Foreground MediaProjection service never gets killed mid-match',
                        'Instant 1-tap launch straight into your game',
                      ],
                      buttonLabel: 'Download Android APK',
                      onDownload: () => _launchDownload(
                        ref,
                        AppConfig.androidApkDownloadUrl,
                        'Playverzus Android APK',
                      ),
                    ),
                    _PlatformDownloadCard(
                      title: 'Windows Gaming PC',
                      subtitle: 'Windows 10 / 11 (x64 Installer)',
                      icon: CupertinoIcons.desktopcomputer,
                      accent: HigColors.copper,
                      recommended: isWindowsVisitor,
                      bullets: const [
                        'Auto-scans Steam, EA App, Epic & Riot game libraries',
                        'Native Windows Graphics Capture locks onto game window (zero screen-share prompts)',
                        'Auto-detects USB / HDMI capture cards for PS5 & Xbox',
                      ],
                      buttonLabel: 'Download for Windows',
                      onDownload: () => _launchDownload(
                        ref,
                        AppConfig.windowsInstallerUrl,
                        'Playverzus Windows Installer',
                      ),
                    ),
                    _PlatformDownloadCard(
                      title: 'iPhone & iPad (iOS)',
                      subtitle: 'iOS 16+ · TestFlight & App Store',
                      icon: CupertinoIcons.device_phone_portrait,
                      accent: HigColors.blue,
                      recommended: defaultTargetPlatform == TargetPlatform.iOS,
                      bullets: const [
                        'Native Apple ReplayKit 1-tap live match sync',
                        'Full Apple HIG Dynamic Island & Haptics experience',
                        'Instant native Share Sheet for Proof of Victory cards',
                      ],
                      buttonLabel: 'Open iOS TestFlight',
                      onDownload: () => _launchDownload(
                        ref,
                        AppConfig.iosTestFlightUrl,
                        'Playverzus iOS TestFlight',
                      ),
                    ),
                    _PlatformDownloadCard(
                      title: 'macOS Desktop',
                      subtitle: 'Apple Silicon & Intel (.dmg)',
                      icon: CupertinoIcons.device_laptop,
                      accent: HigColors.indigo,
                      recommended:
                          defaultTargetPlatform == TargetPlatform.macOS,
                      bullets: const [
                        'Native ScreenCaptureKit window auto-lock',
                        'Full-bleed HIG split-view desktop arena',
                        'USB Capture Card support for console matches',
                      ],
                      buttonLabel: 'Download for macOS',
                      onDownload: () => _launchDownload(
                        ref,
                        AppConfig.macosDmgUrl,
                        'Playverzus macOS App',
                      ),
                    ),
                  ];

                  if (!twoCol) {
                    return Column(
                      children: [
                        for (int i = 0; i < cards.length; i++) ...[
                          cards[i],
                          if (i != cards.length - 1)
                            const SizedBox(height: 16),
                        ],
                      ],
                    );
                  }

                  return Column(
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: cards[0]),
                          const SizedBox(width: 16),
                          Expanded(child: cards[1]),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: cards[2]),
                          const SizedBox(width: 16),
                          Expanded(child: cards[3]),
                        ],
                      ),
                    ],
                  );
                },
              ),

              const SizedBox(height: 22),

              // Clean 3-Step Android Direct APK Guide
              GlassCard(
                radius: 18,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(top: 2),
                          child: Icon(
                            CupertinoIcons.info_circle_fill,
                            color: HigColors.emerald,
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'How to Install the Android APK (30 Seconds)',
                            style: HigTypography.headline(),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _stepRow('1', 'Tap "Download Android APK" above to download playverzus-v2-android.apk.'),
                    const SizedBox(height: 8),
                    _stepRow('2', 'Open the downloaded file and allow "Install unknown apps" for your browser if prompted.'),
                    const SizedBox(height: 8),
                    _stepRow('3', 'Sign in once — Playverzus automatically scans your installed games and registers your device.'),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _stepRow(String num, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: HigColors.emerald.withValues(alpha: 0.16),
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            num,
            style: HigTypography.mono(size: 11, color: HigColors.emerald),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: HigTypography.footnote())),
      ],
    );
  }
}

class _PlatformDownloadCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color accent;
  final bool recommended;
  final List<String> bullets;
  final String buttonLabel;
  final VoidCallback onDownload;

  const _PlatformDownloadCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.accent,
    required this.recommended,
    required this.bullets,
    required this.buttonLabel,
    required this.onDownload,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 20,
      padding: const EdgeInsets.all(20),
      borderColor: recommended ? accent.withValues(alpha: 0.5) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: accent, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(title, style: HigTypography.title3()),
                        if (recommended)
                          const HigBadge(
                            label: 'RECOMMENDED',
                            tone: HigBadgeTone.emerald,
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(subtitle, style: HigTypography.caption()),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: bullets
                .map(
                  (b) => Padding(
                    padding: const EdgeInsets.only(bottom: 7),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          CupertinoIcons.checkmark_alt_circle_fill,
                          size: 14,
                          color: accent,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            b,
                            style: HigTypography.footnote(),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 14),
          HigButton(
            label: buttonLabel,
            icon: CupertinoIcons.arrow_down_circle_fill,
            variant: accent == HigColors.emerald
                ? HigButtonVariant.emerald
                : HigButtonVariant.primary,
            fullWidth: true,
            onPressed: onDownload,
          ),
        ],
      ),
    );
  }
}
