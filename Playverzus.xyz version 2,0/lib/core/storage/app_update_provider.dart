import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../platform_channels/web_bridge.dart';
import '../config/app_config.dart';
import '../network/api_client.dart';

/// Pure semantic + build number comparison used across native APKs, desktop
/// builds, and standalone PWA manifests.
bool isNewerAppVersion({
  required String currentVersion,
  required int currentBuild,
  required String remoteVersion,
  int remoteBuild = 0,
}) {
  if (remoteVersion.trim().isEmpty) return false;
  List<int> parse(String v) => v
      .split('+')[0]
      .split('.')
      .map((s) => int.tryParse(s.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0)
      .toList();

  final c = parse(currentVersion);
  final r = parse(remoteVersion);
  final len = c.length > r.length ? c.length : r.length;
  for (var i = 0; i < len; i++) {
    final cv = i < c.length ? c[i] : 0;
    final rv = i < r.length ? r[i] : 0;
    if (rv > cv) return true;
    if (rv < cv) return false;
  }
  return remoteBuild > 0 && remoteBuild > currentBuild;
}

class AppUpdateState {
  final String currentVersion;
  final int currentBuildNumber;
  final String latestVersion;
  final int latestBuildNumber;
  final String minSupportedVersion;
  final String releaseNotes;
  final String downloadedAppVersion;
  final int downloadedBuildNumber;
  final String dismissedVersion;
  final bool dismissedSwInSession;
  final bool swUpdateReady;
  final bool checking;
  final DateTime? lastCheckedAt;

  const AppUpdateState({
    this.currentVersion = AppConfig.appVersion,
    this.currentBuildNumber = AppConfig.appBuildNumber,
    this.latestVersion = AppConfig.appVersion,
    this.latestBuildNumber = AppConfig.appBuildNumber,
    this.minSupportedVersion = '2.0.0',
    this.releaseNotes =
        'Improved device readiness, permission alerts, and game launch sync.',
    this.downloadedAppVersion = '',
    this.downloadedBuildNumber = 0,
    this.dismissedVersion = '',
    this.dismissedSwInSession = false,
    this.swUpdateReady = false,
    this.checking = false,
    this.lastCheckedAt,
  });

  /// True when the player is inside the installed native/standalone app OR
  /// previously downloaded/installed a version on this device.
  bool get hasInstalledOrDownloadedApp =>
      !kIsWeb || isRunningStandaloneApp() || downloadedAppVersion.isNotEmpty;

  String get _effectiveLocalVersion {
    if (!kIsWeb || isRunningStandaloneApp()) return currentVersion;
    return downloadedAppVersion.isNotEmpty
        ? downloadedAppVersion
        : currentVersion;
  }

  int get _effectiveLocalBuild {
    if (!kIsWeb || isRunningStandaloneApp()) return currentBuildNumber;
    return downloadedAppVersion.isNotEmpty
        ? downloadedBuildNumber
        : currentBuildNumber;
  }

  bool get hasNewerDownloadedRelease =>
      hasInstalledOrDownloadedApp &&
      isNewerAppVersion(
        currentVersion: _effectiveLocalVersion,
        currentBuild: _effectiveLocalBuild,
        remoteVersion: latestVersion,
        remoteBuild: latestBuildNumber,
      );

  bool get isForcedUpdate =>
      hasInstalledOrDownloadedApp &&
      isNewerAppVersion(
        currentVersion: _effectiveLocalVersion,
        currentBuild: 0,
        remoteVersion: minSupportedVersion,
        remoteBuild: 0,
      );

  bool get hasPendingUpdate {
    final swReady = swUpdateReady && !dismissedSwInSession;
    final verReady = hasNewerDownloadedRelease &&
        (isForcedUpdate || dismissedVersion != latestVersion);
    return swReady || verReady;
  }

  AppUpdateState copyWith({
    String? currentVersion,
    int? currentBuildNumber,
    String? latestVersion,
    int? latestBuildNumber,
    String? minSupportedVersion,
    String? releaseNotes,
    String? downloadedAppVersion,
    int? downloadedBuildNumber,
    String? dismissedVersion,
    bool? dismissedSwInSession,
    bool? swUpdateReady,
    bool? checking,
    DateTime? lastCheckedAt,
  }) {
    return AppUpdateState(
      currentVersion: currentVersion ?? this.currentVersion,
      currentBuildNumber: currentBuildNumber ?? this.currentBuildNumber,
      latestVersion: latestVersion ?? this.latestVersion,
      latestBuildNumber: latestBuildNumber ?? this.latestBuildNumber,
      minSupportedVersion: minSupportedVersion ?? this.minSupportedVersion,
      releaseNotes: releaseNotes ?? this.releaseNotes,
      downloadedAppVersion: downloadedAppVersion ?? this.downloadedAppVersion,
      downloadedBuildNumber:
          downloadedBuildNumber ?? this.downloadedBuildNumber,
      dismissedVersion: dismissedVersion ?? this.dismissedVersion,
      dismissedSwInSession: dismissedSwInSession ?? this.dismissedSwInSession,
      swUpdateReady: swUpdateReady ?? this.swUpdateReady,
      checking: checking ?? this.checking,
      lastCheckedAt: lastCheckedAt ?? this.lastCheckedAt,
    );
  }
}

class AppUpdateNotifier extends StateNotifier<AppUpdateState> {
  static const _kDownloadedVerKey = 'playverzus_downloaded_app_version';
  static const _kDownloadedBuildKey = 'playverzus_downloaded_app_build';
  static const _kDismissedVerKey = 'playverzus_dismissed_update_version';

  bool _hydrated = false;

  AppUpdateNotifier() : super(const AppUpdateState());

  Future<void> _ensureHydrated() async {
    if (_hydrated) return;
    _hydrated = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final dlVer = prefs.getString(_kDownloadedVerKey) ?? '';
      final dlBuild = prefs.getInt(_kDownloadedBuildKey) ?? 0;
      final dismissed = prefs.getString(_kDismissedVerKey) ?? '';
      // Running standalone PWA / native app automatically records the running version.
      final effectiveVer =
          (!kIsWeb || isRunningStandaloneApp()) ? AppConfig.appVersion : dlVer;
      final effectiveBuild = (!kIsWeb || isRunningStandaloneApp())
          ? AppConfig.appBuildNumber
          : dlBuild;
      state = state.copyWith(
        downloadedAppVersion: effectiveVer,
        downloadedBuildNumber: effectiveBuild,
        dismissedVersion: dismissed,
        swUpdateReady: hasPendingWebUpdate(),
      );
    } catch (_) {}
  }

  /// Called when a user triggers an installer download or PWA install so
  /// future releases know to notify them that a newer app version exists.
  Future<void> recordDownloadedCurrentVersion({
    String? version,
    int? buildNumber,
  }) async {
    await _ensureHydrated();
    final ver = version ?? AppConfig.appVersion;
    final build = buildNumber ?? AppConfig.appBuildNumber;
    state = state.copyWith(
      downloadedAppVersion: ver,
      downloadedBuildNumber: build,
      dismissedVersion: '',
    );
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kDownloadedVerKey, ver);
      await prefs.setInt(_kDownloadedBuildKey, build);
      await prefs.remove(_kDismissedVerKey);
    } catch (_) {}
  }

  Future<void> dismissCurrentUpdate() async {
    await _ensureHydrated();
    state = state.copyWith(
      dismissedVersion: state.latestVersion,
      dismissedSwInSession: true,
    );
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kDismissedVerKey, state.latestVersion);
    } catch (_) {}
  }

  void applyRemoteManifest({
    required String latestVersion,
    int latestBuildNumber = 0,
    String? minSupportedVersion,
    String? releaseNotes,
    bool? swUpdateReady,
  }) {
    state = state.copyWith(
      latestVersion: latestVersion,
      latestBuildNumber: latestBuildNumber,
      minSupportedVersion: minSupportedVersion ?? state.minSupportedVersion,
      releaseNotes: releaseNotes ?? state.releaseNotes,
      swUpdateReady: swUpdateReady ?? state.swUpdateReady,
      lastCheckedAt: DateTime.now(),
    );
  }

  Future<AppUpdateState> checkForUpdates({bool force = false}) async {
    await _ensureHydrated();
    if (state.checking) return state;
    final last = state.lastCheckedAt;
    if (!force &&
        last != null &&
        DateTime.now().difference(last) < const Duration(minutes: 5)) {
      return state;
    }

    state = state.copyWith(checking: true);
    checkWebServiceWorkerUpdate();
    var bestVer = state.latestVersion;
    var bestBuild = state.latestBuildNumber;
    var minVer = state.minSupportedVersion;
    var notes = state.releaseNotes;

    // 1. Check backend /api/health version metadata (works for APK, Desktop & Web)
    try {
      final res = await ApiClient.get('/health');
      if (res is Map) {
        final v = (res['latestAppVersion'] ?? '').toString().trim();
        final b = (res['latestBuildNumber'] as num?)?.toInt() ?? 0;
        final m = (res['minSupportedVersion'] ?? '').toString().trim();
        final r = (res['releaseNotes'] ?? '').toString().trim();
        if (v.isNotEmpty &&
            isNewerAppVersion(
              currentVersion: bestVer,
              currentBuild: bestBuild,
              remoteVersion: v,
              remoteBuild: b,
            )) {
          bestVer = v;
          bestBuild = b;
        }
        if (m.isNotEmpty) minVer = m;
        if (r.isNotEmpty) notes = r;
      }
    } catch (_) {}

    // 2. Check live web /version.json (cache-busted) so Vercel builds trigger instant update alerts
    if (kIsWeb) {
      try {
        final manifestUrl =
            '${Uri.base.origin}/version.json?_ts=${DateTime.now().millisecondsSinceEpoch}';
        final res = await ApiClient.dio.getUri<dynamic>(
          Uri.parse(manifestUrl),
          options: Options(receiveTimeout: const Duration(seconds: 6)),
        );
        final data = res.data;
        if (data is Map) {
          final v = (data['version'] ?? '').toString().trim();
          final b =
              int.tryParse((data['build_number'] ?? '0').toString()) ?? 0;
          if (v.isNotEmpty &&
              isNewerAppVersion(
                currentVersion: bestVer,
                currentBuild: bestBuild,
                remoteVersion: v,
                remoteBuild: b,
              )) {
            bestVer = v;
            bestBuild = b;
          }
        }
      } catch (_) {}
    }

    state = state.copyWith(
      latestVersion: bestVer,
      latestBuildNumber: bestBuild,
      minSupportedVersion: minVer,
      releaseNotes: notes,
      swUpdateReady: hasPendingWebUpdate(),
      checking: false,
      lastCheckedAt: DateTime.now(),
    );
    return state;
  }
}

final appUpdateProvider =
    StateNotifierProvider<AppUpdateNotifier, AppUpdateState>((ref) {
  return AppUpdateNotifier();
});
