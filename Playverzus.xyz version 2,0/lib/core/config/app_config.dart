import 'package:flutter/foundation.dart';

/// Centralized runtime configuration for Playverzus.xyz Version 2.0.
/// Uses same-origin `/api` proxy on localhost web previews (eliminating CORS),
/// and connects directly to the live Playverzus NestJS API on production & native builds.
class AppConfig {
  static const String _envApiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: '',
  );

  static String get apiBaseUrl {
    if (_envApiUrl.isNotEmpty) return _envApiUrl;
    if (kIsWeb) {
      final host = Uri.base.host.toLowerCase();
      if (host == 'localhost' || host == '127.0.0.1') {
        return '${Uri.base.origin}/api';
      }
    }
    return 'https://playverzus-api.onrender.com/api';
  }

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://vebpkkjerwaaupuahomz.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'sb_publishable_eKvZ4DS2IDm59Tk4JhLCVg_a6dsN7yD',
  );

  /// Direct download URLs served from Flutter Web (`web/downloads/...`) or CDN.
  static const String androidApkDownloadUrl = String.fromEnvironment(
    'ANDROID_APK_URL',
    defaultValue: 'downloads/playverzus-v2-android.apk',
  );

  static const String windowsInstallerUrl = String.fromEnvironment(
    'WINDOWS_INSTALLER_URL',
    defaultValue: 'downloads/playverzus-v2-windows-setup.exe',
  );

  static const String macosDmgUrl = String.fromEnvironment(
    'MACOS_DMG_URL',
    defaultValue: 'downloads/playverzus-v2-macos.dmg',
  );

  static const String iosTestFlightUrl = String.fromEnvironment(
    'IOS_APP_URL',
    defaultValue: 'https://testflight.apple.com/join/playverzus',
  );

  static const String appVersion = '2.0.0';
  static const double usdToKesRate = 130.0;
}
