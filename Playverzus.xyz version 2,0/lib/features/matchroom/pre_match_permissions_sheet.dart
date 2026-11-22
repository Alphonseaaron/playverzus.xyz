import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../../platform_channels/device_bridge.dart';

/// Pre-Match Permissions Modal modeled cleanly on v1 `MatchPermissionsModal.tsx`.
/// Keeps prompting whenever Screen/Game Feed Capture or Live OS Alerts remain
/// unauthorized on the current browser or native device.
class PreMatchPermissionsDialog extends ConsumerStatefulWidget {
  final String gameName;

  const PreMatchPermissionsDialog({
    super.key,
    required this.gameName,
  });

  /// Ensures required device permissions are explicitly authorized before arming
  /// Ready/Auto-Launch or binding match telemetry. Re-prompts cleanly every time
  /// required permissions are still missing.
  static Future<bool> ensureAuthorized(
    BuildContext context,
    WidgetRef ref, {
    required String gameName,
  }) async {
    final machine = ref.read(machineAuthProvider);
    if (machine.isFullyReady &&
        machine.alertsAuthorized &&
        machine.captureAuthorized) {
      return true;
    }

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.76),
      builder: (_) => PreMatchPermissionsDialog(gameName: gameName),
    );
    return result == true;
  }

  @override
  ConsumerState<PreMatchPermissionsDialog> createState() =>
      _PreMatchPermissionsDialogState();
}

class _PreMatchPermissionsDialogState
    extends ConsumerState<PreMatchPermissionsDialog> {
  bool _requestingScreen = false;
  bool _requestingNotifs = false;

  ({String label, IconData icon, String screenTip, String pushTip})
      _platformCopy(String osKey) {
    switch (osKey) {
      case 'macos':
        return (
          label: 'macOS Desktop',
          icon: CupertinoIcons.device_laptop,
          screenTip:
              'Select your game window in macOS Screen Recording / browser share permissions so scoreboards sync automatically.',
          pushTip:
              'macOS banner notifications will alert you when your opponent readies up or a match settles.',
        );
      case 'android':
        return (
          label: 'Android Mobile',
          icon: CupertinoIcons.device_phone_portrait,
          screenTip: kIsWeb
              ? 'Mobile browsers pause background feeds — allow capture/proof upload mode or install the Android Companion APK for live tracking.'
              : 'Foreground MediaProjection stays active while your game runs in fullscreen.',
          pushTip:
              'Heads-up Android alerts notify you immediately on score events and match settlement.',
        );
      case 'ios':
        return (
          label: 'iPhone & iPad',
          icon: CupertinoIcons.device_phone_portrait,
          screenTip: kIsWeb
              ? 'Mobile Safari protects background apps — authorize 1-tap final scoreboard proof upload for 2-second verification.'
              : 'Native Apple ReplayKit syncs your scoreboard automatically.',
          pushTip:
              'iOS alerts notify you as soon as opponents join or Full Time locks.',
        );
      case 'linux':
        return (
          label: 'Linux Desktop',
          icon: CupertinoIcons.desktopcomputer,
          screenTip:
              'Share your game window or monitor using PipeWire / browser screen sharing so scores record cleanly.',
          pushTip:
              'Desktop notifications keep you synced when full-screen matches start or end.',
        );
      default:
        return (
          label: 'Windows PC',
          icon: CupertinoIcons.desktopcomputer,
          screenTip:
              'In the browser sharing popup, choose your ${widget.gameName} window or display so scores verify automatically.',
          pushTip:
              'Windows notification alerts ping you during fullscreen gameplay when Ready locks or settlement completes.',
        );
    }
  }

  Future<void> _grantScreenCapture() async {
    setState(() => _requestingScreen = true);
    try {
      final ok = await ref
          .read(machineAuthProvider.notifier)
          .promptScreenCapturePermission();
      if (!mounted) return;
      if (!ok) {
        ref.read(toastProvider.notifier).show(
              'Screen Share Permission Required',
              body:
                  'Approve the browser window/screen picker to verify ${widget.gameName} frames in volatile RAM.',
              tone: ToastTone.warning,
            );
      }
    } finally {
      if (mounted) setState(() => _requestingScreen = false);
    }
  }

  Future<void> _grantNotifications() async {
    setState(() => _requestingNotifs = true);
    try {
      final ok = await ref
          .read(machineAuthProvider.notifier)
          .promptNotificationPermission();
      if (!mounted) return;
      if (!ok) {
        final state = DeviceBridge.getNotificationPermissionState();
        ref.read(toastProvider.notifier).show(
              state == 'denied'
                  ? 'Notifications Blocked in Browser'
                  : 'Notification Permission Required',
              body: state == 'denied'
                  ? 'Click the lock/settings icon in your browser address bar, allow Notifications, then tap Allow Alerts again.'
                  : 'Allow live alerts so you do not miss opponent Ready checks or payout events.',
              tone: ToastTone.warning,
            );
      }
    } finally {
      if (mounted) setState(() => _requestingNotifs = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final machine = ref.watch(machineAuthProvider);
    final osKey = DeviceBridge.detectVisitorPlatformKey();
    final info = _platformCopy(osKey);
    final screenDone = machine.captureAuthorized;
    final notifsDone = machine.alertsAuthorized;
    final grantedCount = (screenDone ? 1 : 0) + (notifsDone ? 1 : 0);
    final allGranted = screenDone && notifsDone;
    final browserNotifDenied =
        kIsWeb && DeviceBridge.getNotificationPermissionState() == 'denied';

    return Dialog(
      backgroundColor: HigColors.surfacePrimary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: HigColors.separator),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: HigColors.brand,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Pre-Match Permissions',
                              style: HigTypography.title3(),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Required by your device before arming ${widget.gameName} auto-launch and live alerts.',
                          style: HigTypography.footnote(
                            color: HigColors.labelSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  HigBadge(
                    label: info.label.toUpperCase(),
                    icon: info.icon,
                    tone: HigBadgeTone.neutral,
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Permission 1: Game Window Feed & Anti-Cheat Capture
              _PermissionTile(
                index: '1',
                title: 'Game Window Feed & Anti-Cheat',
                subtitle: info.screenTip,
                privacyNote:
                    'Processed ephemerally in local volatile RAM. Zero video recorded or stored.',
                icon: CupertinoIcons.desktopcomputer,
                granted: screenDone,
                loading: _requestingScreen,
                actionLabel: screenDone ? 'Connected' : 'Connect Feed',
                onTap: _grantScreenCapture,
              ),
              const SizedBox(height: 12),

              // Permission 2: Device Alerts & Live Match Pings
              _PermissionTile(
                index: '2',
                title: 'Device Alerts & Match Pings',
                subtitle: info.pushTip,
                privacyNote: browserNotifDenied
                    ? 'Notifications are currently blocked in browser site permissions — allow them in site settings, then tap Retry.'
                    : 'Sends instant alerts for opponent Ready, kickoff, and payout locks.',
                warningTone: browserNotifDenied && !notifsDone,
                icon: CupertinoIcons.bell_fill,
                granted: notifsDone,
                loading: _requestingNotifs,
                actionLabel: notifsDone
                    ? 'Allowed'
                    : (browserNotifDenied ? 'Retry Check' : 'Allow Alerts'),
                onTap: _grantNotifications,
              ),
              const SizedBox(height: 16),

              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                decoration: BoxDecoration(
                  color: HigColors.surfaceGrouped,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: HigColors.separator),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Permissions Status',
                      style: HigTypography.footnote(
                        color: HigColors.labelSecondary,
                      ),
                    ),
                    Text(
                      allGranted
                          ? 'All Systems Verified'
                          : '$grantedCount / 2 Permissions Ready',
                      style: HigTypography.mono(
                        size: 12,
                        weight: FontWeight.w700,
                        color: allGranted
                            ? HigColors.emerald
                            : HigColors.amber,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              Row(
                children: [
                  HigButton(
                    label: 'Cancel',
                    variant: HigButtonVariant.ghost,
                    size: HigButtonSize.small,
                    onPressed: () => Navigator.of(context).pop(false),
                  ),
                  const Spacer(),
                  HigButton(
                    label: 'Proceed to Duel',
                    variant: allGranted
                        ? HigButtonVariant.emerald
                        : HigButtonVariant.secondary,
                    onPressed: allGranted
                        ? () => Navigator.of(context).pop(true)
                        : null,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PermissionTile extends StatelessWidget {
  final String index;
  final String title;
  final String subtitle;
  final String privacyNote;
  final IconData icon;
  final bool granted;
  final bool loading;
  final bool warningTone;
  final String actionLabel;
  final VoidCallback onTap;

  const _PermissionTile({
    required this.index,
    required this.title,
    required this.subtitle,
    required this.privacyNote,
    required this.icon,
    required this.granted,
    required this.loading,
    required this.actionLabel,
    required this.onTap,
    this.warningTone = false,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = granted
        ? HigColors.emerald.withValues(alpha: 0.45)
        : warningTone
            ? HigColors.amber.withValues(alpha: 0.45)
            : HigColors.separator;
    final bgColor = granted
        ? HigColors.emerald.withValues(alpha: 0.08)
        : HigColors.surfaceGrouped;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 18,
            color: granted ? HigColors.emerald : HigColors.brand,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$index. $title',
                  style: HigTypography.headline().copyWith(fontSize: 13.5),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: HigTypography.caption(color: HigColors.labelSecondary),
                ),
                const SizedBox(height: 6),
                Text(
                  privacyNote,
                  style: HigTypography.caption(
                    color: warningTone
                        ? HigColors.amber
                        : (granted ? HigColors.emerald : HigColors.labelTertiary),
                  ).copyWith(fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          HigButton(
            label: actionLabel,
            size: HigButtonSize.small,
            loading: loading,
            variant: granted
                ? HigButtonVariant.emerald
                : HigButtonVariant.primary,
            onPressed: granted ? null : onTap,
          ),
        ],
      ),
    );
  }
}
