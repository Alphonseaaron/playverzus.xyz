import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../catalog/official_games.dart';
import '../network/api_client.dart';
import '../../platform_channels/device_bridge.dart';

enum WalletPlayMode { realCash, demoPoints }

enum PaymentGatewayMode { kopokopo, crossmint }

enum ToastTone { info, success, matchEvent, warning, error }

class FrostedToast {
  final String id;
  final String title;
  final String? body;
  final ToastTone tone;
  final DateTime createdAt;

  FrostedToast({
    required this.id,
    required this.title,
    this.body,
    this.tone = ToastTone.info,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();
}

class ToastNotifier extends StateNotifier<List<FrostedToast>> {
  ToastNotifier() : super(const []);

  void show(
    String title, {
    String? body,
    ToastTone tone = ToastTone.info,
    Duration duration = const Duration(seconds: 4),
  }) {
    HapticFeedback.lightImpact();
    final id = '${DateTime.now().microsecondsSinceEpoch}';
    final toast = FrostedToast(id: id, title: title, body: body, tone: tone);
    state = [toast, ...state].take(3).toList();
    Future.delayed(duration, () => dismiss(id));
  }

  void dismiss(String id) {
    state = state.where((t) => t.id != id).toList();
  }
}

final toastProvider =
    StateNotifierProvider<ToastNotifier, List<FrostedToast>>((ref) {
  return ToastNotifier();
});

/// Global Active Game State (Scoped per logged-in userId — never bleeds across accounts)
class ActiveGameNotifier extends StateNotifier<OfficialGame> {
  ActiveGameNotifier() : super(findOfficialGameById('eafc'));

  String _userId = '';

  String get _storageKey => 'playverzus_v2_active_game_$_userId';

  Future<void> bindToUser(String userId) async {
    _userId = userId;
    if (userId.isEmpty) {
      state = findOfficialGameById('eafc');
      return;
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_storageKey);
      if (saved != null && saved.isNotEmpty) {
        state = findOfficialGameById(saved);
      } else {
        state = findOfficialGameById('eafc');
      }
    } catch (_) {}
  }

  Future<void> selectGame(OfficialGame game) async {
    HapticFeedback.selectionClick();
    state = game;
    if (_userId.isEmpty) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, game.id);
    } catch (_) {}
  }
}

final activeGameProvider =
    StateNotifierProvider<ActiveGameNotifier, OfficialGame>((ref) {
  return ActiveGameNotifier();
});

/// Wallet Mode (Real Cash vs Practice PTS)
class WalletModeNotifier extends StateNotifier<WalletPlayMode> {
  WalletModeNotifier() : super(WalletPlayMode.realCash);

  void toggle() {
    HapticFeedback.selectionClick();
    state = state == WalletPlayMode.realCash
        ? WalletPlayMode.demoPoints
        : WalletPlayMode.realCash;
  }

  void setMode(WalletPlayMode mode) {
    HapticFeedback.selectionClick();
    state = mode;
  }

  void reset() => state = WalletPlayMode.realCash;
}

final walletModeProvider =
    StateNotifierProvider<WalletModeNotifier, WalletPlayMode>((ref) {
  return WalletModeNotifier();
});

/// Admin-Controlled Payment Gateway Switch: Kopo Kopo (M-PESA / KES) <-> Crossmint (USD / USDC)
class PaymentGatewayNotifier extends StateNotifier<PaymentGatewayMode> {
  PaymentGatewayNotifier() : super(PaymentGatewayMode.kopokopo) {
    _hydrate();
  }

  static const _key = 'playverzus_v2_payment_gateway';

  Future<void> _hydrate() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key);
      if (raw == 'crossmint') {
        state = PaymentGatewayMode.crossmint;
      } else if (raw == 'kopokopo') {
        state = PaymentGatewayMode.kopokopo;
      }
    } catch (_) {}
  }

  Future<void> setGateway(PaymentGatewayMode mode) async {
    HapticFeedback.mediumImpact();
    state = mode;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _key,
        mode == PaymentGatewayMode.crossmint ? 'crossmint' : 'kopokopo',
      );
    } catch (_) {}
  }
}

final paymentGatewayProvider =
    StateNotifierProvider<PaymentGatewayNotifier, PaymentGatewayMode>((ref) {
  return PaymentGatewayNotifier();
});

/// Device-Honest, User-Scoped Machine Binding:
/// - Android APK: hardware fingerprint + real PackageManager installed-game scan
/// - Windows/macOS Desktop: machine fingerprint + PC launcher scan
/// - Web Browser: browser fingerprint only (never fakes OS-installed games!)
class MachineAuthState {
  final String boundUserId;
  final String machineId;
  final String deviceFingerprint;
  final String deviceModel;
  final bool hardwareAttested;
  final bool fingerprintSynced;
  final bool osNotificationsGranted;
  final DateTime? lastGameScanAt;
  final DeviceCapabilities capabilities;
  final bool alertsAuthorized;
  final bool captureAuthorized;
  final bool autoEscrowEnabled;
  final List<String> installedGameIds;
  final String consoleStreamPlatform; // 'TWITCH' | 'YOUTUBE'
  final String consoleStreamChannel;

  const MachineAuthState({
    required this.boundUserId,
    required this.machineId,
    required this.deviceFingerprint,
    required this.deviceModel,
    required this.hardwareAttested,
    required this.fingerprintSynced,
    required this.osNotificationsGranted,
    this.lastGameScanAt,
    required this.capabilities,
    required this.alertsAuthorized,
    required this.captureAuthorized,
    required this.autoEscrowEnabled,
    required this.installedGameIds,
    required this.consoleStreamPlatform,
    required this.consoleStreamChannel,
  });

  bool get canAutoScanGames => capabilities.supportsNativeGameScan;

  bool get isFullyReady =>
      boundUserId.isNotEmpty &&
      deviceFingerprint.isNotEmpty &&
      deviceFingerprint != 'UNBOUND' &&
      alertsAuthorized;

  /// Only returns installed games that belong to the official 21-game catalog.
  List<OfficialGame> get featuredInstalledGames =>
      officialGames.where((g) => installedGameIds.contains(g.id)).toList();

  String get deviceBindingSummary {
    if (capabilities.isWeb) {
      return 'Browser session bound ($deviceFingerprint). Web browsers cannot scan local OS apps — use the Android APK or Desktop client for automatic game detection and force auto-launch.';
    }
    return 'Native ${capabilities.osLabel} bound ($deviceFingerprint). ${featuredInstalledGames.length} featured titles detected on this device.';
  }

  MachineAuthState copyWith({
    String? boundUserId,
    String? machineId,
    String? deviceFingerprint,
    String? deviceModel,
    bool? hardwareAttested,
    bool? fingerprintSynced,
    bool? osNotificationsGranted,
    DateTime? lastGameScanAt,
    bool? alertsAuthorized,
    bool? captureAuthorized,
    bool? autoEscrowEnabled,
    List<String>? installedGameIds,
    String? consoleStreamPlatform,
    String? consoleStreamChannel,
  }) {
    return MachineAuthState(
      boundUserId: boundUserId ?? this.boundUserId,
      machineId: machineId ?? this.machineId,
      deviceFingerprint: deviceFingerprint ?? this.deviceFingerprint,
      deviceModel: deviceModel ?? this.deviceModel,
      hardwareAttested: hardwareAttested ?? this.hardwareAttested,
      fingerprintSynced: fingerprintSynced ?? this.fingerprintSynced,
      osNotificationsGranted:
          osNotificationsGranted ?? this.osNotificationsGranted,
      lastGameScanAt: lastGameScanAt ?? this.lastGameScanAt,
      capabilities: capabilities,
      alertsAuthorized: alertsAuthorized ?? this.alertsAuthorized,
      captureAuthorized: captureAuthorized ?? this.captureAuthorized,
      autoEscrowEnabled: autoEscrowEnabled ?? this.autoEscrowEnabled,
      installedGameIds: installedGameIds ?? this.installedGameIds,
      consoleStreamPlatform:
          consoleStreamPlatform ?? this.consoleStreamPlatform,
      consoleStreamChannel: consoleStreamChannel ?? this.consoleStreamChannel,
    );
  }
}

class MachineAuthNotifier extends StateNotifier<MachineAuthState> {
  MachineAuthNotifier() : super(_emptyState());

  static MachineAuthState _emptyState() {
    final caps = DeviceBridge.detectCapabilities();
    return MachineAuthState(
      boundUserId: '',
      machineId: '',
      deviceFingerprint: 'UNBOUND',
      deviceModel: caps.osLabel,
      hardwareAttested: false,
      fingerprintSynced: false,
      osNotificationsGranted: false,
      capabilities: caps,
      alertsAuthorized: false,
      captureAuthorized: false,
      autoEscrowEnabled: true,
      installedGameIds: const [],
      consoleStreamPlatform: 'TWITCH',
      consoleStreamChannel: '',
    );
  }

  String _storageKeyFor(String userId) => 'playverzus_v2_machine_$userId';

  /// Wipes machine binding from memory on sign-out so User B never inherits User A's state.
  void clearForSignOut() {
    state = _emptyState();
  }

  /// Device-dependent automatic binding run whenever a user signs in or registers:
  /// - Web Browser: binds browser fingerprint + requests Web Notification permission; keeps installed games honest (only what user explicitly pinned or native app detected).
  /// - Android APK / Desktop Native: captures hardware fingerprint + runs real OS installed-game scan against the 21 featured games.
  Future<MachineAuthState> bootstrapOnRegistration({
    required String userId,
    required String username,
  }) async {
    if (userId.isEmpty) return state;

    // 1. Hydrate any prior device settings specifically for THIS userId
    List<String> userPinnedGames = const [];
    String savedStreamPlatform = 'TWITCH';
    String savedStreamChannel = '';
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKeyFor(userId));
      if (raw != null) {
        final map = jsonDecode(raw) as Map<String, dynamic>;
        userPinnedGames = (map['installedGameIds'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            const [];
        savedStreamPlatform =
            (map['consoleStreamPlatform'] as String?) ?? 'TWITCH';
        savedStreamChannel =
            (map['consoleStreamChannel'] as String?) ?? '';
      }
    } catch (_) {}

    // 2. Collect real device fingerprint matching the current runtime device
    final fp = await DeviceBridge.collectDeviceFingerprint();
    final osNotifOk = await DeviceBridge.requestNotificationPermission();

    // 3. Scan installed games ONLY when running on a native OS that supports it
    final officialIds = officialGames.map((g) => g.id).toSet();
    List<String> verifiedGames = [...userPinnedGames.where(officialIds.contains)];
    if (!kIsWeb && state.capabilities.supportsNativeGameScan) {
      final scanned = await DeviceBridge.scanInstalledGames();
      final validScanned = scanned.where(officialIds.contains).toList();
      verifiedGames = {...validScanned, ...verifiedGames}.toList();
    }

    state = state.copyWith(
      boundUserId: userId,
      machineId: fp.fingerprintId,
      deviceFingerprint: fp.fingerprintId,
      deviceModel: fp.deviceModel,
      hardwareAttested: fp.hardwareAttested,
      osNotificationsGranted: osNotifOk,
      alertsAuthorized: true,
      captureAuthorized: !kIsWeb || savedStreamChannel.isNotEmpty,
      autoEscrowEnabled: true,
      installedGameIds: verifiedGames,
      consoleStreamPlatform: savedStreamPlatform,
      consoleStreamChannel: savedStreamChannel,
      lastGameScanAt: DateTime.now(),
      fingerprintSynced: true,
    );

    await _persist();
    return state;
  }

  /// Re-scans installed games on native Android / Desktop.
  /// On Web, returns current user-pinned games honestly without faking OS detection.
  Future<int> rescanInstalledGames() async {
    HapticFeedback.selectionClick();
    if (kIsWeb || !state.capabilities.supportsNativeGameScan) {
      state = state.copyWith(lastGameScanAt: DateTime.now());
      return state.installedGameIds.length;
    }
    final scanned = await DeviceBridge.scanInstalledGames();
    final officialIds = officialGames.map((g) => g.id).toSet();
    final matched = scanned.where(officialIds.contains).toList();
    final merged = {...matched, ...state.installedGameIds}.toList();
    state = state.copyWith(
      installedGameIds: merged,
      lastGameScanAt: DateTime.now(),
    );
    await _persist();
    return merged.length;
  }

  Future<void> _persist() async {
    if (state.boundUserId.isEmpty) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _storageKeyFor(state.boundUserId),
        jsonEncode({
          'machineId': state.machineId,
          'deviceFingerprint': state.deviceFingerprint,
          'deviceModel': state.deviceModel,
          'hardwareAttested': state.hardwareAttested,
          'fingerprintSynced': state.fingerprintSynced,
          'osNotificationsGranted': state.osNotificationsGranted,
          'alertsAuthorized': state.alertsAuthorized,
          'captureAuthorized': state.captureAuthorized,
          'autoEscrowEnabled': state.autoEscrowEnabled,
          'installedGameIds': state.installedGameIds,
          'consoleStreamPlatform': state.consoleStreamPlatform,
          'consoleStreamChannel': state.consoleStreamChannel,
        }),
      );
    } catch (_) {}
  }

  Future<void> authorizeAllOnce() async {
    HapticFeedback.mediumImpact();
    final fp = (state.deviceFingerprint.isEmpty ||
            state.deviceFingerprint == 'UNBOUND')
        ? await DeviceBridge.collectDeviceFingerprint()
        : null;
    final osNotif = await DeviceBridge.requestNotificationPermission();
    state = state.copyWith(
      machineId: fp?.fingerprintId ?? state.machineId,
      deviceFingerprint: fp?.fingerprintId ?? state.deviceFingerprint,
      deviceModel: fp?.deviceModel ?? state.deviceModel,
      hardwareAttested: fp?.hardwareAttested ?? state.hardwareAttested,
      fingerprintSynced: true,
      osNotificationsGranted: osNotif,
      alertsAuthorized: true,
      captureAuthorized: true,
      autoEscrowEnabled: true,
    );
    await _persist();
  }

  Future<void> toggleInstalledGame(String gameId) async {
    HapticFeedback.selectionClick();
    final current = [...state.installedGameIds];
    if (current.contains(gameId)) {
      current.remove(gameId);
    } else {
      current.add(gameId);
    }
    state = state.copyWith(installedGameIds: current);
    await _persist();
  }

  Future<void> setConsoleStream(String platform, String channel) async {
    state = state.copyWith(
      consoleStreamPlatform: platform,
      consoleStreamChannel: channel.trim(),
      captureAuthorized:
          channel.trim().isNotEmpty ? true : state.captureAuthorized,
    );
    await _persist();
  }
}

final machineAuthProvider =
    StateNotifierProvider<MachineAuthNotifier, MachineAuthState>((ref) {
  return MachineAuthNotifier();
});

/// Strictly User-Scoped Linked In-Game Handles (Empty by default; wiped on sign-out!)
class GameAccountsNotifier extends StateNotifier<Map<String, String>> {
  GameAccountsNotifier() : super(const {});

  String _userId = '';

  String get _storageKey => 'playverzus_v2_handles_$_userId';

  void clearForSignOut() {
    _userId = '';
    state = const {};
  }

  Future<void> loadForUser(
    String userId, {
    Map<String, String>? serverHandles,
  }) async {
    _userId = userId;
    if (userId.isEmpty) {
      state = const {};
      return;
    }
    Map<String, String> merged = {};
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw != null) {
        final decoded = Map<String, dynamic>.from(jsonDecode(raw) as Map);
        merged.addAll(decoded.map((k, v) => MapEntry(k, v.toString())));
      }
    } catch (_) {}

    if (serverHandles != null) {
      merged.addAll(serverHandles);
    }
    state = merged;
  }

  Future<String?> setHandle(String gameId, String handle) async {
    final trimmed = handle.trim();
    if (trimmed.isEmpty) return 'Enter a valid handle.';
    HapticFeedback.lightImpact();

    // Persist locally for this user AND sync to backend profile
    state = {...state, gameId: trimmed};
    if (_userId.isNotEmpty) {
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_storageKey, jsonEncode(state));
      } catch (_) {}
    }

    try {
      await ApiClient.post('/profile/me/gamertag', data: {
        'gameId': gameId,
        'gamertag': trimmed,
      });
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return null;
    }
  }
}

final gameAccountsProvider =
    StateNotifierProvider<GameAccountsNotifier, Map<String, String>>((ref) {
  return GameAccountsNotifier();
});

/// Authenticated Session State with Strict RBAC (Guest / Player / Game Developer / Admin)
class PlayerSession {
  final bool isAuthenticated;
  final bool isHydrating;
  final String userId;
  final String username;
  final String email;
  final String countryCode;
  final String role;
  final String studioName;
  final int elo;
  final int wins;
  final int losses;
  final double cashUsd;
  final int demoPoints;
  final String? accessToken;
  final String? syncError;

  const PlayerSession({
    required this.isAuthenticated,
    this.isHydrating = false,
    required this.userId,
    required this.username,
    required this.email,
    required this.countryCode,
    required this.role,
    this.studioName = '',
    required this.elo,
    required this.wins,
    required this.losses,
    required this.cashUsd,
    required this.demoPoints,
    this.accessToken,
    this.syncError,
  });

  static const PlayerSession guest = PlayerSession(
    isAuthenticated: false,
    isHydrating: false,
    userId: '',
    username: '',
    email: '',
    countryCode: 'KE',
    role: 'GUEST',
    studioName: '',
    elo: 1200,
    wins: 0,
    losses: 0,
    cashUsd: 0.0,
    demoPoints: 0,
  );

  bool get isAdmin => const [
        'ADMIN',
        'SUPER_ADMIN',
        'TOURNAMENT_ADMIN',
        'FINANCE_AUDITOR',
        'REVIEWER',
        'SUPPORT',
        'COMMUNITY_MANAGER',
        'SECURITY_ENGINEER',
      ].contains(role.toUpperCase());

  bool get isStaff => isAdmin;

  bool get isDeveloper => isAuthenticated && role.toUpperCase() == 'GAME_DEVELOPER';

  bool get isPlayer => isAuthenticated && !isAdmin;

  double get cashKes => cashUsd * 130.0;

  PlayerSession copyWith({
    bool? isAuthenticated,
    bool? isHydrating,
    String? userId,
    String? username,
    String? email,
    String? countryCode,
    String? role,
    String? studioName,
    int? elo,
    int? wins,
    int? losses,
    double? cashUsd,
    int? demoPoints,
    String? accessToken,
    String? syncError,
    bool clearSyncError = false,
  }) {
    return PlayerSession(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isHydrating: isHydrating ?? this.isHydrating,
      userId: userId ?? this.userId,
      username: username ?? this.username,
      email: email ?? this.email,
      countryCode: countryCode ?? this.countryCode,
      role: role ?? this.role,
      studioName: studioName ?? this.studioName,
      elo: elo ?? this.elo,
      wins: wins ?? this.wins,
      losses: losses ?? this.losses,
      cashUsd: cashUsd ?? this.cashUsd,
      demoPoints: demoPoints ?? this.demoPoints,
      accessToken: accessToken ?? this.accessToken,
      syncError: clearSyncError ? null : (syncError ?? this.syncError),
    );
  }
}

class PlayerSessionNotifier extends StateNotifier<PlayerSession> {
  final Ref _ref;

  PlayerSessionNotifier(this._ref) : super(PlayerSession.guest) {
    ApiClient.onUnauthorized = () {
      if (state.isAuthenticated) {
        signOut();
      }
    };
    _hydrateSession();
  }

  static const _sessionKey = 'playverzus_v2_session_v3';

  Future<void> _hydrateSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_sessionKey);
      if (state.isAuthenticated) return;
      if (raw == null || raw.isEmpty) {
        state = PlayerSession.guest;
        return;
      }
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final auth = map['isAuthenticated'] == true;
      final userId = (map['userId'] as String?) ?? '';
      if (!auth || userId.isEmpty) {
        state = PlayerSession.guest;
        return;
      }

      final token = map['accessToken'] as String?;
      ApiClient.setAccessToken(token);

      state = PlayerSession(
        isAuthenticated: true,
        userId: userId,
        username: (map['username'] as String?) ?? '',
        email: (map['email'] as String?) ?? '',
        countryCode: (map['countryCode'] as String?) ?? 'KE',
        role: (map['role'] as String?) ?? 'PLAYER',
        studioName: (map['studioName'] as String?) ?? '',
        elo: (map['elo'] as num?)?.toInt() ?? 1200,
        wins: (map['wins'] as num?)?.toInt() ?? 0,
        losses: (map['losses'] as num?)?.toInt() ?? 0,
        cashUsd: (map['cashUsd'] as num?)?.toDouble() ?? 0.0,
        demoPoints: (map['demoPoints'] as num?)?.toInt() ?? 0,
        accessToken: token,
      );

      // Bind per-user state cleanly
      await _bindPerUserSubsystems(state);
      // Silently refresh live profile & balance from backend if token exists
      if (token != null && token.isNotEmpty) {
        await refreshFromBackend();
      }
    } catch (_) {
      state = PlayerSession.guest;
    }
  }

  Future<void> _persistSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!state.isAuthenticated || state.userId.isEmpty) {
        await prefs.remove(_sessionKey);
        return;
      }
      await prefs.setString(
        _sessionKey,
        jsonEncode({
          'isAuthenticated': state.isAuthenticated,
          'userId': state.userId,
          'username': state.username,
          'email': state.email,
          'countryCode': state.countryCode,
          'role': state.role,
          'studioName': state.studioName,
          'elo': state.elo,
          'wins': state.wins,
          'losses': state.losses,
          'cashUsd': state.cashUsd,
          'demoPoints': state.demoPoints,
          'accessToken': state.accessToken,
        }),
      );
    } catch (_) {}
  }

  Future<void> _bindPerUserSubsystems(PlayerSession session) async {
    await _ref.read(activeGameProvider.notifier).bindToUser(session.userId);
    await _ref.read(gameAccountsProvider.notifier).loadForUser(session.userId);
    await _ref.read(machineAuthProvider.notifier).bootstrapOnRegistration(
          userId: session.userId,
          username: session.username,
        );
  }

  /// Syncs live user profile, role, handles, and wallet balances directly from NestJS backend.
  Future<void> refreshFromBackend() async {
    if (!state.isAuthenticated) return;
    try {
      final profile = await ApiClient.get('/profile/me');
      if (profile is Map<String, dynamic>) {
        final rawHandles = profile['game_accounts'];
        Map<String, String>? serverHandles;
        if (rawHandles is Map) {
          serverHandles = rawHandles
              .map((k, v) => MapEntry(k.toString(), v.toString()));
        }
        final dbRole = (profile['role'] as String?) ?? state.role;
        String effectiveRole = dbRole;
        String effectiveStudio = state.studioName;

        // Check Game Developer registry for non-admin accounts
        final tempCheck = state.copyWith(role: dbRole);
        if (!tempCheck.isAdmin) {
          try {
            final devRes = await ApiClient.get(
              '/developer/role-check',
              queryParameters: {
                'email': (profile['email'] as String?) ?? state.email,
                'userId': (profile['id'] as String?) ?? state.userId,
              },
            );
            if (devRes is Map && devRes['isDeveloper'] == true) {
              effectiveRole = 'GAME_DEVELOPER';
              effectiveStudio =
                  (devRes['studioName'] as String?) ?? effectiveStudio;
            }
          } catch (_) {}
        }

        state = state.copyWith(
          userId: (profile['id'] as String?) ?? state.userId,
          username: (profile['username'] as String?) ?? state.username,
          email: (profile['email'] as String?) ?? state.email,
          countryCode: (profile['country_code'] as String?) ?? state.countryCode,
          role: effectiveRole,
          studioName: effectiveStudio,
          elo: (profile['elo_rating'] as num?)?.toInt() ?? state.elo,
          wins: (profile['wins'] as num?)?.toInt() ?? state.wins,
          losses: (profile['losses'] as num?)?.toInt() ?? state.losses,
          clearSyncError: true,
        );
        if (serverHandles != null) {
          await _ref.read(gameAccountsProvider.notifier).loadForUser(
                state.userId,
                serverHandles: serverHandles,
              );
        }
      }

      if (state.isPlayer) {
        final wallet = await ApiClient.get('/wallet/balance');
        if (wallet is Map<String, dynamic>) {
          // IMPORTANT: In `wallet.service.ts`, `cashUsdc` / `withdrawableUsdc` / `cashEur`
          // is the user's true Real Cash balance, whereas `balance` is Demo Practice Points (PTS).
          // Never map `wallet['balance']` into `cashUsd`!
          state = state.copyWith(
            cashUsd: (wallet['cashUsdc'] as num?)?.toDouble() ??
                (wallet['withdrawableUsdc'] as num?)?.toDouble() ??
                (wallet['cashEur'] as num?)?.toDouble() ??
                (wallet['available'] as num?)?.toDouble() ??
                0.0,
            demoPoints: (wallet['balance'] as num?)?.toInt() ??
                (wallet['demo_tokens'] as num?)?.toInt() ??
                (wallet['demoBalance'] as num?)?.toInt() ??
                state.demoPoints,
          );
        }
      }
      await _persistSession();
    } on ApiException catch (e) {
      state = state.copyWith(syncError: e.message);
    } catch (_) {}
  }

  /// Real backend sign-in accepting Email Address OR Username.
  /// Resolves username -> email via `/auth/resolve-username`, authenticates via
  /// `/auth/login` (or Supabase), auto-confirms if pending, and loads the user's
  /// authoritative role (`PLAYER`, `ADMIN`, `SUPER_ADMIN`, etc.) strictly from the database.
  Future<String?> signInWithBackend(String identifier, String password) async {
    final cleanId = identifier.trim();
    if (cleanId.isEmpty || password.isEmpty) {
      return 'Please enter your email address or username and password.';
    }

    try {
      String targetEmail = cleanId.toLowerCase();
      if (!cleanId.contains('@')) {
        final resolved = await ApiClient.post('/auth/resolve-username', data: {
          'username': cleanId,
        });
        if (resolved is Map && resolved['email'] != null) {
          targetEmail = resolved['email'].toString().toLowerCase();
        } else {
          return 'Could not find an account with username "$cleanId".';
        }
      }

      String? token;
      String userId = '';
      String username = targetEmail.split('@').first;
      String role = 'PLAYER';

      // 1. Authenticate via NestJS `/auth/login` or Supabase Auth
      try {
        final res = await ApiClient.post('/auth/login', data: {
          'email': targetEmail,
          'password': password,
        });
        if (res is Map<String, dynamic>) {
          final sess = res['session'] as Map<String, dynamic>?;
          final usr = res['user'] as Map<String, dynamic>?;
          token = (sess?['access_token'] ?? res['access_token'])?.toString();
          userId = (usr?['id'] ?? res['id'] ?? '').toString();
          username = (usr?['username'] ??
                  usr?['user_metadata']?['username'] ??
                  username)
              .toString();
          role = (usr?['role'] ?? res['role'] ?? 'PLAYER').toString();
        }
      } on ApiException catch (e) {
        if (e.message.toLowerCase().contains('email not confirmed')) {
          try {
            await ApiClient.post('/auth/confirm', data: {'email': targetEmail});
            final retry = await ApiClient.post('/auth/login', data: {
              'email': targetEmail,
              'password': password,
            });
            if (retry is Map<String, dynamic>) {
              final sess = retry['session'] as Map<String, dynamic>?;
              final usr = retry['user'] as Map<String, dynamic>?;
              token = (sess?['access_token'] ?? retry['access_token'])?.toString();
              userId = (usr?['id'] ?? retry['id'] ?? '').toString();
              role = (usr?['role'] ?? retry['role'] ?? 'PLAYER').toString();
            }
          } catch (_) {
            return e.message;
          }
        } else if (e.statusCode != null &&
            e.statusCode! >= 400 &&
            e.statusCode! < 500) {
          return e.message;
        } else {
          final supa = await Supabase.instance.client.auth.signInWithPassword(
            email: targetEmail,
            password: password,
          );
          token = supa.session?.accessToken;
          userId = supa.user?.id ?? '';
          username =
              (supa.user?.userMetadata?['username'] as String?) ?? username;
        }
      }

      if (userId.isEmpty && (token == null || token.isEmpty)) {
        return 'Invalid email/username or password.';
      }

      ApiClient.setAccessToken(token);
      state = PlayerSession(
        isAuthenticated: true,
        userId: userId.isNotEmpty ? userId : 'usr_${targetEmail.hashCode}',
        username: username,
        email: targetEmail,
        countryCode: 'KE',
        role: role,
        elo: 1200,
        wins: 0,
        losses: 0,
        cashUsd: 0.0,
        demoPoints: 0,
        accessToken: token,
      );

      // Database profile is the single source of truth for role (ADMIN/STAFF vs PLAYER)
      await refreshFromBackend();
      await _bindPerUserSubsystems(state);
      await _persistSession();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } on AuthException catch (e) {
      return e.message;
    } catch (e) {
      return 'Unable to sign in: $e';
    }
  }

  /// Real backend account registration supporting Player & Game Developer accounts.
  /// Admin/Staff roles are NEVER selectable here — recognized exclusively from DB on sign-in.
  Future<String?> registerWithBackend({
    required String email,
    required String password,
    required String username,
    String? fullName,
    String? dateOfBirth,
    String? phone,
    required String countryCode,
    bool asDeveloper = false,
    String? studioName,
  }) async {
    final cleanEmail = email.trim().toLowerCase();
    final cleanUser = username.trim();
    if (cleanUser.length < 3) {
      return 'Gamer tag / username must be at least 3 characters.';
    }
    if (!cleanEmail.contains('@')) {
      return 'Enter a valid email address.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (countryCode.trim().isEmpty) {
      return 'Please select your country / nationality.';
    }
    if (asDeveloper && (studioName == null || studioName.trim().length < 2)) {
      return 'Enter your Studio or Developer Name (at least 2 characters).';
    }

    try {
      await ApiClient.post('/auth/register', data: {
        'email': cleanEmail,
        'password': password,
        'username': cleanUser,
        if (fullName != null && fullName.trim().isNotEmpty)
          'fullName': fullName.trim(),
        if (dateOfBirth != null && dateOfBirth.trim().isNotEmpty)
          'dateOfBirth': dateOfBirth.trim(),
        if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
        'countryCode': countryCode.trim().toUpperCase(),
      });

      if (asDeveloper) {
        await ApiClient.post('/developer/register-role', data: {
          'email': cleanEmail,
          'username': cleanUser,
          'studioName': studioName!.trim(),
        });
      }

      return await signInWithBackend(cleanEmail, password);
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return 'Registration failed: $e';
    }
  }

  /// Activates Game Developer Studio access for an already signed-in player account.
  Future<String?> enableDeveloperPortal({required String studioName}) async {
    if (!state.isAuthenticated || state.isAdmin) {
      return 'Sign in with a standard account to enable Game Developer Studio.';
    }
    final cleanStudio = studioName.trim();
    if (cleanStudio.length < 2) {
      return 'Enter a valid Studio or Developer Name (at least 2 characters).';
    }
    try {
      await ApiClient.post('/developer/register-role', data: {
        'userId': state.userId,
        'email': state.email,
        'username': state.username,
        'studioName': cleanStudio,
      });
      state = state.copyWith(
        role: 'GAME_DEVELOPER',
        studioName: cleanStudio,
      );
      await _persistSession();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return 'Could not activate Developer Studio: $e';
    }
  }

  /// Isolated local sandbox login for testing RBAC roles cleanly (Player vs Admin).
  Future<void> signInSandboxRole({required bool asAdmin}) async {
    HapticFeedback.mediumImpact();
    ApiClient.setAccessToken(null);

    // Wipe any previous user's scoped state first so zero data leaks across roles
    _ref.read(gameAccountsProvider.notifier).clearForSignOut();
    _ref.read(machineAuthProvider.notifier).clearForSignOut();
    _ref.read(walletModeProvider.notifier).reset();

    state = asAdmin
        ? const PlayerSession(
            isAuthenticated: true,
            userId: 'staff_admin_01',
            username: 'ops_admin',
            email: 'admin@playverzus.xyz',
            countryCode: 'KE',
            role: 'ADMIN',
            elo: 0,
            wins: 0,
            losses: 0,
            cashUsd: 0.0,
            demoPoints: 0,
          )
        : const PlayerSession(
            isAuthenticated: true,
            userId: 'player_member_01',
            username: 'kofi_play',
            email: 'kofi@playverzus.xyz',
            countryCode: 'KE',
            role: 'PLAYER',
            elo: 1200,
            wins: 0,
            losses: 0,
            cashUsd: 0.0,
            demoPoints: 10000,
          );

    await _bindPerUserSubsystems(state);
    await _persistSession();
  }

  /// Complete clean sign-out: revokes token and wipes ALL user-scoped providers from memory.
  Future<void> signOut() async {
    HapticFeedback.mediumImpact();
    try {
      if (state.accessToken != null) {
        await ApiClient.post('/auth/logout');
      }
    } catch (_) {}
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {}

    ApiClient.setAccessToken(null);
    state = PlayerSession.guest;
    _ref.read(gameAccountsProvider.notifier).clearForSignOut();
    _ref.read(machineAuthProvider.notifier).clearForSignOut();
    _ref.read(walletModeProvider.notifier).reset();
    await _ref.read(activeGameProvider.notifier).bindToUser('');
    await _persistSession();
  }

  Future<String?> updateProfile({String? username, String? email, String? phone}) async {
    final nextName = username?.trim().isNotEmpty == true
        ? username!.trim()
        : state.username;
    state = state.copyWith(
      username: nextName,
      email: email?.trim().isNotEmpty == true ? email!.trim() : state.email,
    );
    await _persistSession();

    try {
      await ApiClient.patch('/profile/me', data: {
        'displayName': nextName,
        if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
      });
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return null;
    }
  }

  Future<String?> claimDailyPracticeCoins() async {
    HapticFeedback.mediumImpact();
    try {
      await ApiClient.post('/wallet/claim-demo');
      await refreshFromBackend();
      return null;
    } on ApiException catch (e) {
      if (state.accessToken == null) {
        state = state.copyWith(demoPoints: state.demoPoints + 1000);
        await _persistSession();
        return null;
      }
      return e.message;
    } catch (_) {
      state = state.copyWith(demoPoints: state.demoPoints + 1000);
      await _persistSession();
      return null;
    }
  }

  void addDepositUsd(double amountUsd) {
    HapticFeedback.mediumImpact();
    state = state.copyWith(cashUsd: state.cashUsd + amountUsd);
    _persistSession();
  }

  bool withdrawUsd(double amountUsd) {
    if (amountUsd <= 0 || amountUsd > state.cashUsd) return false;
    HapticFeedback.mediumImpact();
    state = state.copyWith(cashUsd: state.cashUsd - amountUsd);
    _persistSession();
    return true;
  }
}

final playerSessionProvider =
    StateNotifierProvider<PlayerSessionNotifier, PlayerSession>((ref) {
  return PlayerSessionNotifier(ref);
});
