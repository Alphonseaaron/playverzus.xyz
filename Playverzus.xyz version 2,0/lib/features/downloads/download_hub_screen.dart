import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/brand_logo.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../../platform_channels/device_bridge.dart';
import '../../platform_channels/web_bridge.dart';

class _PlatformPackageSpec {
  final String key;
  final String displayTitle;
  final String targetSubtitle;
  final String summary;
  final String buttonLabel;
  final String url;
  final IconData icon;
  final bool isAndroid;

  const _PlatformPackageSpec({
    required this.key,
    required this.displayTitle,
    required this.targetSubtitle,
    required this.summary,
    required this.buttonLabel,
    required this.url,
    required this.icon,
    this.isAndroid = false,
  });
}

/// Auto-Detected Single-Device Companion Download Hub (`/download`).
/// Mirrors FACEIT's minimal single-CTA download UX: identifies the current
/// operating system automatically and recommends only the matching installer,
/// keeping alternate platform switching tucked behind a discreet secondary link.
class DownloadHubScreen extends ConsumerStatefulWidget {
  const DownloadHubScreen({super.key});

  @override
  ConsumerState<DownloadHubScreen> createState() => _DownloadHubScreenState();
}

class _DownloadHubScreenState extends ConsumerState<DownloadHubScreen> {
  late String _detectedKey;
  late String _activeKey;
  bool _showPlatformPicker = false;
  bool _launching = false;
  int? _openFaqIndex;

  static const Map<String, _PlatformPackageSpec> _specs = {
    'windows': _PlatformPackageSpec(
      key: 'windows',
      displayTitle: 'PLAYVERZUS COMPANION\nFOR WINDOWS PC',
      targetSubtitle: 'for Windows 10 / 11 (x64 Installer) · v${AppConfig.appVersion}',
      summary:
          'Seamless sync for Steam, EA App, Epic & Riot titles, dedicated desktop matchrooms, and instant Ready & settlement alerts.',
      buttonLabel: 'DOWNLOAD FOR WINDOWS',
      url: AppConfig.windowsInstallerUrl,
      icon: Icons.laptop_windows_rounded,
    ),
    'android': _PlatformPackageSpec(
      key: 'android',
      displayTitle: 'PLAYVERZUS COMPANION\nFOR ANDROID',
      targetSubtitle: 'for Android 10+ Direct Signed (.apk) · v${AppConfig.appVersion}',
      summary:
          'Built for FC Mobile, PUBG Mobile, MLBB, eFootball & 8 Ball Pool with live match notifications and one-tap duel launches.',
      buttonLabel: 'DOWNLOAD ANDROID APK',
      url: AppConfig.androidApkDownloadUrl,
      icon: Icons.android_rounded,
      isAndroid: true,
    ),
    'macos': _PlatformPackageSpec(
      key: 'macos',
      displayTitle: 'PLAYVERZUS COMPANION\nFOR MACOS',
      targetSubtitle: 'for Apple Silicon & Intel (.dmg) · v${AppConfig.appVersion}',
      summary:
          'Clean macOS desktop matchrooms, automatic title sync across supported games, and instant Ready & payout notifications.',
      buttonLabel: 'DOWNLOAD FOR MACOS',
      url: AppConfig.macosDmgUrl,
      icon: Icons.laptop_mac_rounded,
    ),
    'ios': _PlatformPackageSpec(
      key: 'ios',
      displayTitle: 'PLAYVERZUS COMPANION\nFOR IPHONE & IPAD',
      targetSubtitle: 'for iOS / iPadOS 16+ (TestFlight) · v${AppConfig.appVersion}',
      summary:
          'Fast mobile sync, real-time OS match alerts, and instant Proof of Victory share cards.',
      buttonLabel: 'OPEN IOS TESTFLIGHT',
      url: AppConfig.iosTestFlightUrl,
      icon: Icons.phone_iphone_rounded,
    ),
    'linux': _PlatformPackageSpec(
      key: 'linux',
      displayTitle: 'PLAYVERZUS COMPANION\nFOR LINUX',
      targetSubtitle: 'for Ubuntu / Fedora / Arch (x64) · v${AppConfig.appVersion}',
      summary:
          'Clean Linux desktop matchrooms paired with native Ready notifications and Steam/Lutris library sync.',
      buttonLabel: 'DOWNLOAD FOR LINUX',
      url: AppConfig.windowsInstallerUrl,
      icon: Icons.terminal_rounded,
    ),
  };

  static const List<(String, String)> _faqItems = [
    (
      'What does the Playverzus Companion Client do?',
      'It connects your Playverzus account directly to supported games on your device, launches matches faster, and delivers instant Ready and payout notifications.',
    ),
    (
      'Does Playverzus keep gameplay videos or personal files?',
      'No. Playverzus focuses strictly on final match results and player privacy. We never save, store, or archive personal desktop or gameplay recordings.',
    ),
    (
      'How do PS5, Xbox & Switch console players join?',
      'Link your Twitch or YouTube channel once in Settings, or run your console match alongside the Playverzus Companion app for instant result confirmation.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    final detected = DeviceBridge.detectVisitorPlatformKey();
    _detectedKey = _specs.containsKey(detected) ? detected : 'windows';
    _activeKey = _detectedKey;
  }

  Future<void> _launchDownload(_PlatformPackageSpec spec) async {
    if (_launching) return;
    setState(() => _launching = true);
    try {
      final isExternalUrl =
          spec.url.startsWith('https://') || spec.url.startsWith('http://');
      final hasDirectInstaller =
          isExternalUrl || (kIsWeb && await checkWebAssetAvailable(spec.url));

      if (hasDirectInstaller) {
        final uri = Uri.parse(spec.url);
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        if (!mounted) return;
        ref.read(toastProvider.notifier).show(
              'Download Started',
              body: 'Opening ${spec.buttonLabel.toLowerCase()}...',
              tone: ToastTone.success,
            );
        return;
      }

      if (kIsWeb && isWebAppInstallReady()) {
        final accepted = await promptWebAppInstall();
        if (!mounted) return;
        if (accepted) {
          ref.read(toastProvider.notifier).show(
                'Installing Playverzus App',
                body:
                    'Playverzus is being added to your device as a standalone app.',
                tone: ToastTone.success,
              );
          return;
        }
      }

      if (!mounted) return;
      _showWebAppInstallGuide(spec);
    } catch (_) {
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(
            'Could Not Start Installer Automatically',
            body:
                'Use your browser\'s Install App button in the address bar or menu to install Playverzus directly.',
            tone: ToastTone.warning,
          );
    } finally {
      if (mounted) setState(() => _launching = false);
    }
  }

  void _showWebAppInstallGuide(_PlatformPackageSpec spec) {
    final steps = switch (spec.key) {
      'android' => [
          '1. Tap the 3-dot browser menu (⋮) in Chrome on Android.',
          '2. Select "Install app" or "Add to Home screen".',
          '3. Launch Playverzus directly from your Android home screen for full-screen matchrooms and instant match alerts.',
        ],
      'ios' => [
          '1. Tap the Share button (square with up arrow) in Safari.',
          '2. Scroll down and tap "Add to Home Screen".',
          '3. Open Playverzus from your iPhone or iPad Home Screen.',
        ],
      'macos' => [
          '1. In Safari: click File -> "Add to Dock" (or in Chrome/Edge, click the Install icon in the address bar).',
          '2. Pin Playverzus to your macOS Dock for standalone matchrooms and instant Ready alerts.',
        ],
      _ => [
          '1. In Chrome or Edge: click the "Install Playverzus" icon on the right side of the address bar (or Menu -> Apps -> Install this site).',
          '2. Pin Playverzus to your Windows Taskbar or Desktop.',
          '3. Play directly in a dedicated standalone window with instant OS Ready & payout alerts.',
        ],
    };

    showCupertinoDialog<void>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: Text('Install Playverzus on ${spec.key.toUpperCase()}'),
        content: Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Standalone signed .${spec.isAndroid ? 'apk' : spec.key == 'macos' ? 'dmg' : 'exe'} packages are finalizing release signing. Install the instant standalone app on this device right now:',
                style: const TextStyle(fontSize: 12.5, height: 1.4),
              ),
              const SizedBox(height: 10),
              for (final s in steps) ...[
                Text(
                  s,
                  textAlign: TextAlign.left,
                  style: const TextStyle(fontSize: 12.5, height: 1.4),
                ),
                const SizedBox(height: 6),
              ],
            ],
          ),
        ),
        actions: [
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final compact = Responsive.isCompact(context);
    final spec = _specs[_activeKey] ?? _specs['windows']!;
    final detectedSpec = _specs[_detectedKey] ?? _specs['windows']!;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Centered FACEIT-style Hero Spotlight Stage
          Container(
            decoration: const BoxDecoration(
              color: HigColors.canvas,
              border: Border(
                bottom: BorderSide(color: HigColors.separator, width: 1),
              ),
            ),
            child: CustomPaint(
              painter: _DownloadSpotlightPainter(),
              child: HigMaxWidthContainer(
                maxWidth: 820,
                padding: EdgeInsets.symmetric(
                  horizontal: compact ? 20 : 32,
                  vertical: compact ? 52 : 84,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: 68,
                      height: 68,
                      decoration: BoxDecoration(
                        color: HigColors.surfacePrimary,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: HigColors.brand.withValues(alpha: 0.45),
                          width: 1.2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: HigColors.brand.withValues(alpha: 0.22),
                            blurRadius: 28,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: const BrandLogo.mark(height: 34),
                    ),
                    const SizedBox(height: 20),
                    HigBadge(
                      label: _activeKey == _detectedKey
                          ? 'DETECTED DEVICE · ${detectedSpec.key.toUpperCase()}'
                          : 'SELECTED PLATFORM · ${spec.key.toUpperCase()}',
                      icon: spec.icon,
                      tone: HigBadgeTone.copper,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      spec.displayTitle,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: compact ? 28 : 44,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1.0,
                        height: 1.06,
                        color: HigColors.labelPrimary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 560),
                      child: Text(
                        spec.summary,
                        textAlign: TextAlign.center,
                        style: HigTypography.body(color: HigColors.labelSecondary)
                            .copyWith(fontSize: 14.5, height: 1.52),
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text(
                      spec.targetSubtitle,
                      textAlign: TextAlign.center,
                      style: HigTypography.caption(
                        color: HigColors.labelTertiary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    HigButton(
                      label: spec.buttonLabel,
                      size: HigButtonSize.large,
                      variant: HigButtonVariant.primary,
                      loading: _launching,
                      onPressed: () => _launchDownload(spec),
                    ),
                    if (spec.isAndroid) ...[
                      const SizedBox(height: 18),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 460),
                        child: Text(
                          'Install guide: Download playverzus-v2-android.apk -> Allow "Install unknown apps" for your browser -> Sign in once to detect installed games.',
                          textAlign: TextAlign.center,
                          style: HigTypography.caption(
                            color: HigColors.labelSecondary,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 26),
                    TextButton.icon(
                      onPressed: () => setState(
                        () => _showPlatformPicker = !_showPlatformPicker,
                      ),
                      icon: Icon(
                        _showPlatformPicker
                            ? CupertinoIcons.chevron_up
                            : CupertinoIcons.chevron_down,
                        size: 13,
                        color: HigColors.labelSecondary,
                      ),
                      label: Text(
                        'Need a different platform?',
                        style: HigTypography.footnote(
                          color: HigColors.labelSecondary,
                        ),
                      ),
                    ),
                    if (_showPlatformPicker) ...[
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        alignment: WrapAlignment.center,
                        children: _specs.values.map((s) {
                          final selected = s.key == _activeKey;
                          return ChoiceChip(
                            label: Text(
                              s.key == 'macos'
                                  ? 'macOS'
                                  : s.key == 'ios'
                                      ? 'iOS'
                                      : '${s.key[0].toUpperCase()}${s.key.substring(1)}',
                              style: HigTypography.caption(
                                color: selected
                                    ? Colors.white
                                    : HigColors.labelSecondary,
                              ).copyWith(fontWeight: FontWeight.w600),
                            ),
                            selected: selected,
                            selectedColor: HigColors.brand,
                            backgroundColor: HigColors.surfacePrimary,
                            side: BorderSide(
                              color: selected
                                  ? HigColors.brand
                                  : HigColors.separator,
                            ),
                            onSelected: (_) =>
                                setState(() => _activeKey = s.key),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),

          // Clean FAQ Accordion matching FACEIT `/client`
          HigMaxWidthContainer(
            maxWidth: 760,
            padding: EdgeInsets.symmetric(
              horizontal: compact ? 20 : 32,
              vertical: compact ? 44 : 68,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'FREQUENTLY ASKED QUESTIONS',
                  style: GoogleFonts.inter(
                    fontSize: compact ? 18 : 22,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.4,
                    color: HigColors.labelPrimary,
                  ),
                ),
                const SizedBox(height: 18),
                ...List.generate(_faqItems.length, (i) {
                  final expanded = _openFaqIndex == i;
                  final item = _faqItems[i];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    decoration: BoxDecoration(
                      color: HigColors.surfacePrimary,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: HigColors.separator),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => setState(
                        () => _openFaqIndex = expanded ? null : i,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 16,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    item.$1,
                                    style: HigTypography.headline().copyWith(
                                      fontSize: 14.5,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Icon(
                                  expanded
                                      ? CupertinoIcons.minus
                                      : CupertinoIcons.plus,
                                  size: 16,
                                  color: HigColors.labelSecondary,
                                ),
                              ],
                            ),
                            if (expanded) ...[
                              const SizedBox(height: 10),
                              Text(
                                item.$2,
                                style: HigTypography.footnote(
                                  color: HigColors.labelSecondary,
                                ).copyWith(height: 1.5),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DownloadSpotlightPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(0, -0.85),
        radius: 0.95,
        colors: [
          HigColors.brand.withValues(alpha: 0.22),
          Colors.transparent,
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
