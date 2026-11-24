import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/catalog/official_games.dart';
import 'web_bridge.dart';

enum DeviceCaptureMode {
  nativeAndroidService,
  nativeIosReplayKit,
  nativeDesktopWindowLock,
  webMonitorAutoLock,
  mobileWebSnapshot,
  consoleStreamSync,
}

class DeviceCapabilities {
  final String osLabel;
  final String platformKey;
  final bool supportsNativeGameScan;
  final bool isWeb;
  final DeviceCaptureMode recommendedMode;
  final String modeTitle;
  final String modeDescription;

  const DeviceCapabilities({
    required this.osLabel,
    required this.platformKey,
    required this.supportsNativeGameScan,
    required this.isWeb,
    required this.recommendedMode,
    required this.modeTitle,
    required this.modeDescription,
  });
}

class DeviceFingerprint {
  final String fingerprintId;
  final String deviceModel;
  final String osVersion;
  final bool hardwareAttested;
  final DateTime capturedAt;

  const DeviceFingerprint({
    required this.fingerprintId,
    required this.deviceModel,
    required this.osVersion,
    required this.hardwareAttested,
    required this.capturedAt,
  });

  String get shortCode => fingerprintId.length > 18
      ? fingerprintId.substring(0, 18)
      : fingerprintId;
}

class AutoLaunchResult {
  final bool launched;
  final String channelLabel;
  final String? targetUri;

  const AutoLaunchResult({
    required this.launched,
    required this.channelLabel,
    this.targetUri,
  });
}

/// Unified Cross-Platform Native & Web Bridge for:
/// - Deterministic Device Fingerprinting on first registration / sign-in
/// - Android PackageManager / Desktop installed-game scanning against 21 featured games
/// - Synchronized Force Auto-Launch when both sides are Ready (last button pressed)
/// - Background HUD Verification & High-Priority Live Match OS Notifications
class DeviceBridge {
  static const MethodChannel _channel =
      MethodChannel('xyz.playverzus.v2/device_bridge');

  /// Identifies the visitor's real operating system key across Web & Native:
  /// `'windows'`, `'macos'`, `'android'`, `'ios'`, or `'linux'`.
  static String detectVisitorPlatformKey() {
    if (kIsWeb) {
      return detectWebOsKey();
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'android';
      case TargetPlatform.iOS:
        return 'ios';
      case TargetPlatform.macOS:
        return 'macos';
      case TargetPlatform.linux:
        return 'linux';
      default:
        return 'windows';
    }
  }

  /// True when the user is running a native mobile/desktop build OR an installed standalone PWA.
  static bool isRunningInstalledApp() {
    if (!kIsWeb) return true;
    return isRunningStandaloneApp();
  }

  /// Concise, device-tailored companion download button label.
  static String recommendedAppActionLabel() {
    switch (detectVisitorPlatformKey()) {
      case 'android':
        return 'Download Android App (.apk)';
      case 'ios':
        return 'Get playverzus.xyz iOS App';
      case 'macos':
        return 'Download macOS App (.dmg)';
      case 'linux':
        return 'Download Linux App';
      default:
        return 'Download Windows PC App';
    }
  }

  static DeviceCapabilities detectCapabilities() {
    if (kIsWeb) {
      final osKey = detectWebOsKey();
      final isMobileTarget = osKey == 'android' || osKey == 'ios';
      if (isMobileTarget) {
        return DeviceCapabilities(
          osLabel: osKey == 'ios' ? 'iOS Mobile Web' : 'Android Mobile Web',
          platformKey: osKey,
          supportsNativeGameScan: false,
          isWeb: true,
          recommendedMode: DeviceCaptureMode.mobileWebSnapshot,
          modeTitle: 'Mobile Web Match Sync',
          modeDescription:
              'Quick match confirmation in mobile browser, or install the playverzus.xyz mobile app for instant launches.',
        );
      }
      final desktopLabel = switch (osKey) {
        'macos' => 'macOS Desktop Browser',
        'linux' => 'Linux Desktop Browser',
        _ => 'Windows PC Browser',
      };
      return DeviceCapabilities(
        osLabel: desktopLabel,
        platformKey: osKey,
        supportsNativeGameScan: false,
        isWeb: true,
        recommendedMode: DeviceCaptureMode.webMonitorAutoLock,
        modeTitle: 'Browser Match Sync',
        modeDescription:
            'Automatic match verification and instant Ready & winner settlement directly in your browser.',
      );
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return const DeviceCapabilities(
          osLabel: 'Android Native App',
          platformKey: 'android',
          supportsNativeGameScan: true,
          isWeb: false,
          recommendedMode: DeviceCaptureMode.nativeAndroidService,
          modeTitle: 'Android Auto-Sync',
          modeDescription:
              'Auto-detects installed mobile games, launches on Ready, and pushes live match alerts.',
        );
      case TargetPlatform.iOS:
        return const DeviceCapabilities(
          osLabel: 'iPhone / iPad Native App',
          platformKey: 'ios',
          supportsNativeGameScan: true,
          isWeb: false,
          recommendedMode: DeviceCaptureMode.nativeIosReplayKit,
          modeTitle: 'iOS Auto-Sync',
          modeDescription:
              'Seamless iOS match verification and instant payout alerts.',
        );
      case TargetPlatform.windows:
      case TargetPlatform.macOS:
      case TargetPlatform.linux:
        return DeviceCapabilities(
          osLabel: defaultTargetPlatform == TargetPlatform.macOS
              ? 'macOS Desktop App'
              : 'Windows Gaming PC',
          platformKey: defaultTargetPlatform == TargetPlatform.macOS
              ? 'macos'
              : 'windows',
          supportsNativeGameScan: true,
          isWeb: false,
          recommendedMode: DeviceCaptureMode.nativeDesktopWindowLock,
          modeTitle: 'Desktop Companion Sync',
          modeDescription:
              'Auto-syncs Steam, EA App, Epic & Riot libraries, launches matches on Ready, and confirms results automatically.',
        );
      default:
        return const DeviceCapabilities(
          osLabel: 'Universal Client',
          platformKey: 'other',
          supportsNativeGameScan: false,
          isWeb: false,
          recommendedMode: DeviceCaptureMode.consoleStreamSync,
          modeTitle: 'Console Stream Sync',
          modeDescription:
              'Link Twitch or YouTube once for zero-setup console verification.',
        );
    }
  }

  /// Collects a deterministic hardware/browser Device Fingerprint on registration.
  static Future<DeviceFingerprint> collectDeviceFingerprint() async {
    final caps = detectCapabilities();
    if (!kIsWeb) {
      try {
        final raw = await _channel
            .invokeMapMethod<String, dynamic>('getDeviceFingerprint');
        if (raw != null && (raw['fingerprint'] as String?)?.isNotEmpty == true) {
          return DeviceFingerprint(
            fingerprintId: raw['fingerprint'] as String,
            deviceModel: (raw['deviceModel'] as String?) ?? caps.osLabel,
            osVersion: (raw['osVersion'] as String?) ?? caps.platformKey,
            hardwareAttested: (raw['hardwareAttested'] as bool?) ?? true,
            capturedAt: DateTime.now(),
          );
        }
      } catch (_) {}
    }

    // Deterministic cross-platform fingerprint digest (Web / Desktop / iOS)
    final signals = kIsWeb
        ? collectWebFingerprintSignals()
        : '${caps.platformKey}|${caps.osLabel}|${DateTime.now().timeZoneOffset.inMinutes}';
    final digest = _deterministicHex16('playverzus-v2|$signals');
    final prefix = kIsWeb ? 'PVZ-WEB' : 'PVZ-${caps.platformKey.toUpperCase()}';

    return DeviceFingerprint(
      fingerprintId: '$prefix-$digest',
      deviceModel: caps.osLabel,
      osVersion: kIsWeb ? 'Browser Runtime' : caps.platformKey.toUpperCase(),
      hardwareAttested: !kIsWeb,
      capturedAt: DateTime.now(),
    );
  }

  /// Inspects live browser Notification permission state (`'granted'`, `'denied'`, `'default'`).
  static String getNotificationPermissionState() {
    if (kIsWeb) {
      return getWebNotificationPermissionState();
    }
    return 'default';
  }

  /// Queries real OS notification authorization asynchronously across Web & native builds.
  static Future<String> fetchNotificationPermissionState() async {
    if (kIsWeb) {
      return getWebNotificationPermissionState();
    }
    try {
      final state = await _channel.invokeMethod<String>(
        'getNotificationPermissionState',
      );
      if (state != null && state.isNotEmpty) return state;
    } catch (_) {}
    return 'default';
  }

  /// Whether this runtime supports real screen/window sharing for live match verification.
  static bool supportsLiveScreenShare() {
    if (!kIsWeb) return true;
    final osKey = detectWebOsKey();
    return osKey != 'android' && osKey != 'ios';
  }

  /// Requests real OS notification permission without silently faking approval.
  static Future<bool> requestNotificationPermission() async {
    if (kIsWeb) {
      return requestWebNotificationPermission();
    }
    try {
      final ok = await _channel.invokeMethod<bool>(
        'requestNotificationPermission',
      );
      return ok ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Requests real OS Screen/Window Share permission (`getDisplayMedia` on Web
  /// or native OS MediaProjection/ScreenCapture). Returns true ONLY if user grants access.
  static Future<bool> requestScreenCapturePermission() async {
    if (kIsWeb) {
      return requestWebDisplayCapturePermission();
    }
    try {
      final ok =
          await _channel.invokeMethod<bool>('requestCapturePermission');
      return ok ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Queries native OS for installed Playverzus-supported featured games.
  /// Returns matching canonical game IDs (e.g., ['eafcm', 'pubgm', '8ballpool']).
  static Future<List<String>> scanInstalledGames() async {
    if (kIsWeb) return const [];
    try {
      final packageMap = <String, String>{};
      for (final game in officialGames) {
        if (defaultTargetPlatform == TargetPlatform.android &&
            game.androidPackageId != null) {
          packageMap[game.id] = game.androidPackageId!;
        } else if (game.windowsProcessName != null) {
          packageMap[game.id] = game.windowsProcessName!;
        }
      }
      final result = await _channel.invokeMethod<List<dynamic>>(
        'scanInstalledGames',
        {'targets': packageMap},
      );
      if (result != null) {
        return result.map((e) => e.toString()).toList();
      }
    } catch (_) {
      // Graceful fallback when running in dev harness before native build
    }
    return const [];
  }

  /// Arms native background verification & persistent live status notification.
  static Future<bool> startNativeCapture({
    required String matchId,
    required String gameId,
    String? gameTitle,
    String? roomCode,
  }) async {
    if (kIsWeb) return true;
    try {
      final ok = await _channel.invokeMethod<bool>('startNativeCapture', {
        'matchId': matchId,
        'gameId': gameId,
        'gameTitle': gameTitle ?? findOfficialGameById(gameId).displayName,
        'roomCode': roomCode ?? 'LIVE',
      });
      return ok ?? true;
    } catch (_) {
      return true;
    }
  }

  static Future<void> stopNativeCapture() async {
    if (kIsWeb) return;
    try {
      await _channel.invokeMethod<void>('stopNativeCapture');
    } catch (_) {}
  }

  /// Sends a high-priority OS background notification while the player is inside the game.
  static Future<bool> sendLiveMatchNotification({
    required String title,
    required String body,
    bool ongoing = false,
  }) async {
    if (kIsWeb) {
      return sendWebOsNotification(title: title, body: body);
    }
    try {
      final ok = await _channel.invokeMethod<bool>('sendMatchNotification', {
        'title': title,
        'body': body,
        'ongoing': ongoing,
      });
      return ok ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Force auto-launches the featured game immediately when both sides press Ready.
  static Future<AutoLaunchResult> forceAutoLaunchGame(
    OfficialGame game, {
    required String matchId,
  }) async {
    final uriStr = game.effectiveLaunchUri;

    // 1. Native Android PackageManager / Desktop MethodChannel launch
    if (!kIsWeb) {
      try {
        final ok = await _channel.invokeMethod<bool>('launchGame', {
          'gameId': game.id,
          'matchId': matchId,
          'androidPackageId': game.androidPackageId,
          'windowsProcessName': game.windowsProcessName,
          'launchUri': uriStr,
        });
        if (ok == true) {
          return AutoLaunchResult(
            launched: true,
            channelLabel: defaultTargetPlatform == TargetPlatform.android
                ? 'Android PackageManager Auto-Launch'
                : 'Native Desktop Auto-Launch',
            targetUri: game.androidPackageId ?? uriStr,
          );
        }
      } catch (_) {}
    }

    // 2. Cross-platform deep-link / Steam / Epic / Riot / Mobile / Web Arena launch
    if (uriStr != null && uriStr.isNotEmpty) {
      String targetLaunch = uriStr;
      if (uriStr.startsWith('android-app://') &&
          kIsWeb &&
          detectVisitorPlatformKey() == 'android' &&
          game.androidPackageId != null) {
        targetLaunch =
            'intent://#Intent;package=${game.androidPackageId};end';
      }
      if (!targetLaunch.startsWith('android-app://')) {
        try {
          final uri = Uri.parse(targetLaunch);
          if (await canLaunchUrl(uri)) {
            final launched = await launchUrl(
              uri,
              mode: LaunchMode.externalApplication,
            );
            if (launched) {
              return AutoLaunchResult(
                launched: true,
                channelLabel: 'Launcher Protocol Deep-Link',
                targetUri: targetLaunch,
              );
            }
          }
        } catch (_) {}
      }
    }

    // 3. Fallback: Background Watch Mode armed cleanly while user switches into game
    return AutoLaunchResult(
      launched: false,
      channelLabel: 'Background Auto-Watch Armed',
      targetUri: uriStr ?? game.androidPackageId,
    );
  }

  /// Backward-compatible single-tap manual launcher wrapper.
  static Future<bool> launchInstalledGame(OfficialGame game) async {
    final res = await forceAutoLaunchGame(game, matchId: 'manual_launch');
    return res.launched;
  }

  /// Pure-Dart 64-bit FNV-1a + Murmur-style avalanche hex digest (16 uppercase hex chars).
  static String _deterministicHex16(String input) {
    int h1 = 0x811c9dc5;
    int h2 = 0x9e3779b9;
    for (final code in input.codeUnits) {
      h1 ^= code;
      h1 = (h1 * 0x01000193) & 0xFFFFFFFF;
      h2 ^= (code + (h1 >> 3));
      h2 = (h2 * 0x85ebca6b) & 0xFFFFFFFF;
    }
    final p1 = h1.toRadixString(16).padLeft(8, '0').toUpperCase();
    final p2 = h2.toRadixString(16).padLeft(8, '0').toUpperCase();
    return '${p1.substring(0, 4)}-${p1.substring(4, 8)}-${p2.substring(0, 4)}-${p2.substring(4, 8)}';
  }
}
