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
  String _notifState = DeviceBridge.getNotificationPermissionState();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await ref.read(machineAuthProvider.notifier).syncLivePermissionStates();
      final live = await DeviceBridge.fetchNotificationPermissionState();
      if (mounted) setState(() => _notifState = live);
    });
  }

  ({String label, IconData icon, String screenTip, String pushTip})
      _platformCopy(String osKey) {
    switch (osKey) {
      case 'macos':
        return (
          label: 'macOS Desktop',
          icon: CupertinoIcons.device_laptop,
          screenTip:
              'Approve your browser/macOS screen share prompt so ${widget.gameName} duels confirm smoothly.',
          pushTip:
              'macOS notifications alert you immediately when your opponent readies up or a match settles.',
        );
      case 'android':
        return (
          label: 'Android Mobile',
          icon: CupertinoIcons.device_phone_portrait,
          screenTip: kIsWeb
              ? 'Mobile browsers do not support background screen sharing. Confirm match-room mode below or install the playverzus.xyz Android app.'
              : 'Approve Android screen projection when prompted so live ${widget.gameName} matches verify cleanly.',
          pushTip:
              'Android alerts notify you immediately on opponent Ready checks, kickoffs, and payouts.',
        );
      case 'ios':
        return (
          label: 'iPhone & iPad',
          icon: CupertinoIcons.device_phone_portrait,
          screenTip: kIsWeb
              ? 'Mobile browsers do not support background screen sharing. Confirm match-room mode below for ${widget.gameName}.'
              : 'Approve screen verification when prompted so ${widget.gameName} matches sync smoothly.',
          pushTip:
              'iOS alerts notify you as soon as opponents join or your match finishes.',
        );
      case 'linux':
        return (
          label: 'Linux Desktop',
          icon: CupertinoIcons.desktopcomputer,
          screenTip:
              'Approve the system screen/window share prompt when starting so ${widget.gameName} matches verify automatically.',
          pushTip:
              'Desktop notifications keep you synced when full-screen matches start or end.',
        );
      default:
        return (
          label: 'Windows PC',
          icon: CupertinoIcons.desktopcomputer,
          screenTip:
              'Approve the Windows/browser screen share prompt so ${widget.gameName} duels confirm automatically.',
          pushTip:
              'Windows notification alerts ping you during gameplay when Ready locks or settlement completes.',
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
              'Screen Share Required',
              body:
                  'Your device prompt was dismissed. Tap Allow Access and pick your game window or screen to continue.',
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
      final live = await DeviceBridge.fetchNotificationPermissionState();
      if (!mounted) return;
      setState(() => _notifState = live);
      if (!ok) {
        ref.read(toastProvider.notifier).show(
              live == 'denied'
                  ? 'Notifications Blocked in Device Settings'
                  : 'Notification Permission Required',
              body: live == 'denied'
                  ? 'Notifications were previously blocked for playverzus.xyz. Enable them in browser/device Settings, then tap Retry Check.'
                  : 'Tap Allow on the device prompt so playverzus.xyz can notify you when opponents Ready up.',
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
    final supportsLiveShare = DeviceBridge.supportsLiveScreenShare();
    final screenDone = machine.captureAuthorized;
    final notifsDone = machine.alertsAuthorized;
    final grantedCount = (screenDone ? 1 : 0) + (notifsDone ? 1 : 0);
    final allGranted = screenDone && notifsDone;
    final notifDenied = _notifState == 'denied';

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

              // Permission 1: Live Match Verification Access
              _PermissionTile(
                index: '1',
                title: supportsLiveShare
                    ? 'Screen Share Verification Access'
                    : 'Match-Room Score Confirmation',
                subtitle: info.screenTip,
                privacyNote:
                    'Used strictly during active duels for automatic verification. Zero videos are recorded or stored.',
                icon: CupertinoIcons.desktopcomputer,
                granted: screenDone,
                loading: _requestingScreen,
                actionLabel: screenDone
                    ? 'Connected'
                    : (supportsLiveShare ? 'Ask Device' : 'Acknowledge'),
                onTap: _grantScreenCapture,
              ),
              const SizedBox(height: 12),

              // Permission 2: Device Alerts & Live Match Pings
              _PermissionTile(
                index: '2',
                title: 'Device Notifications',
                subtitle: info.pushTip,
                privacyNote: notifDenied
                    ? 'Blocked in your browser or OS settings — allow Notifications for playverzus.xyz in Settings, then tap Retry Check.'
                    : 'Requests your device\'s real notification prompt for opponent Ready, kickoff, and payout alerts.',
                warningTone: notifDenied && !notifsDone,
                icon: CupertinoIcons.bell_fill,
                granted: notifsDone,
                loading: _requestingNotifs,
                actionLabel: notifsDone
                    ? 'Allowed'
                    : (notifDenied ? 'Retry Check' : 'Ask Device'),
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
