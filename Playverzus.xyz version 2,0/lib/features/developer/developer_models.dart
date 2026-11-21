import 'package:flutter/material.dart';
import '../../core/catalog/official_games.dart';

/// Platform-aware API connector presets tailored to where a game runs.
class PlatformConnectorPreset {
  final String id;
  final String platform; // 'PC' | 'CONSOLE' | 'MOBILE' | 'WEB' | 'ALL'
  final String label;
  final String description;
  final String defaultBaseUrl;
  final String defaultPlayerStatsPath;
  final String defaultMatchResultPath;
  final String defaultAuthType; // 'NONE' | 'API_KEY_HEADER' | 'BEARER_TOKEN' | 'QUERY_PARAM'
  final String defaultAuthHeader;
  final String defaultAuthParam;
  final String launchHint;
  final String handleLabel;

  const PlatformConnectorPreset({
    required this.id,
    required this.platform,
    required this.label,
    required this.description,
    required this.defaultBaseUrl,
    required this.defaultPlayerStatsPath,
    required this.defaultMatchResultPath,
    required this.defaultAuthType,
    this.defaultAuthHeader = 'X-API-Key',
    this.defaultAuthParam = 'api_key',
    this.launchHint = '',
    this.handleLabel = 'Player ID',
  });
}

const List<PlatformConnectorPreset> platformConnectorPresets = [
  // PC Connectors
  PlatformConnectorPreset(
    id: 'PC_CUSTOM_REST',
    platform: 'PC',
    label: 'Custom PC Server REST API',
    description: 'Fetch PC match & career stats from your studio REST backend.',
    defaultBaseUrl: 'https://api.yourgame.com/v1',
    defaultPlayerStatsPath: '/players/{playerId}/stats?platform=pc',
    defaultMatchResultPath: '/matches/{matchId}/result',
    defaultAuthType: 'BEARER_TOKEN',
    launchHint: 'steam://rungameid/YOUR_APP_ID or mygame://launch',
    handleLabel: 'PC Player ID / Steam64',
  ),
  PlatformConnectorPreset(
    id: 'STEAM_WEB_API',
    platform: 'PC',
    label: 'Steamworks Web API (ISteamUserStats)',
    description: 'Pull PC user stats & achievements directly from Steamworks.',
    defaultBaseUrl: 'https://api.steampowered.com',
    defaultPlayerStatsPath:
        '/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&steamid={playerId}',
    defaultMatchResultPath: '/IDOTA2Match_570/GetMatchDetails/v1/?match_id={matchId}',
    defaultAuthType: 'QUERY_PARAM',
    defaultAuthParam: 'key',
    launchHint: 'steam://rungameid/YOUR_STEAM_APP_ID',
    handleLabel: 'SteamID64',
  ),
  PlatformConnectorPreset(
    id: 'EPIC_EOS_API',
    platform: 'PC',
    label: 'Epic Online Services (EOS) Stats API',
    description: 'Query player stats and leaderboards from Epic Online Services.',
    defaultBaseUrl: 'https://api.epicgames.dev',
    defaultPlayerStatsPath: '/stats/v1/{playerId}/stats',
    defaultMatchResultPath: '/matchmaking/v1/matches/{matchId}',
    defaultAuthType: 'BEARER_TOKEN',
    launchHint: 'com.epicgames.launcher://apps/YOUR_APP',
    handleLabel: 'Epic Account ID',
  ),

  // Console Connectors
  PlatformConnectorPreset(
    id: 'CONSOLE_CROSSPLAY_REST',
    platform: 'CONSOLE',
    label: 'Publisher Cross-Play REST API',
    description: 'Query PS5 / Xbox / Switch stats via your cross-play backend.',
    defaultBaseUrl: 'https://api.yourgame.com/v1',
    defaultPlayerStatsPath: '/console/players/{playerId}/stats',
    defaultMatchResultPath: '/console/matches/{matchId}',
    defaultAuthType: 'API_KEY_HEADER',
    defaultAuthHeader: 'X-API-Key',
    launchHint: 'Cross-Play Match Lobby Code',
    handleLabel: 'PSN ID / Xbox Gamertag',
  ),
  PlatformConnectorPreset(
    id: 'XBOX_LIVE_API',
    platform: 'CONSOLE',
    label: 'Xbox Live Stats API (OpenXBL / XSTS)',
    description: 'Read Xbox Gamertag leaderboards and game stats.',
    defaultBaseUrl: 'https://xbl.io/api/v2',
    defaultPlayerStatsPath: '/achievements/player/{playerId}',
    defaultMatchResultPath: '/player/summary/{playerId}',
    defaultAuthType: 'API_KEY_HEADER',
    defaultAuthHeader: 'X-Authorization',
    launchHint: 'Xbox Title ID',
    handleLabel: 'Xbox XUID / Gamertag',
  ),
  PlatformConnectorPreset(
    id: 'PSN_PARTNER_API',
    platform: 'CONSOLE',
    label: 'PlayStation Partner Stats API',
    description: 'Connect your PlayStation Network partner telemetry endpoint.',
    defaultBaseUrl: 'https://m.np.playstation.com/api',
    defaultPlayerStatsPath: '/userProfile/v1/internal/users/{playerId}/stats',
    defaultMatchResultPath: '/matches/v1/{matchId}',
    defaultAuthType: 'BEARER_TOKEN',
    launchHint: 'PSN Activity Deep Link',
    handleLabel: 'PSN Online ID',
  ),

  // Mobile Connectors
  PlatformConnectorPreset(
    id: 'MOBILE_CUSTOM_REST',
    platform: 'MOBILE',
    label: 'Custom Mobile Backend REST API',
    description: 'Pull Android / iOS stats from your studio game server.',
    defaultBaseUrl: 'https://api.yourmobilegame.com/v1',
    defaultPlayerStatsPath: '/players/{playerId}/stats?platform=mobile',
    defaultMatchResultPath: '/matches/{matchId}/summary',
    defaultAuthType: 'API_KEY_HEADER',
    defaultAuthHeader: 'X-API-Key',
    launchHint: 'com.studio.yourgame (Android Package ID)',
    handleLabel: 'Mobile Player UID',
  ),
  PlatformConnectorPreset(
    id: 'PLAYFAB_API',
    platform: 'MOBILE',
    label: 'Azure PlayFab Stats API',
    description: 'Fetch player statistics & leaderboard scores from PlayFab.',
    defaultBaseUrl: 'https://YOUR_TITLE_ID.playfabapi.com',
    defaultPlayerStatsPath: '/Server/GetPlayerStatistics',
    defaultMatchResultPath: '/Match/GetMatch',
    defaultAuthType: 'API_KEY_HEADER',
    defaultAuthHeader: 'X-SecretKey',
    launchHint: 'com.studio.yourgame',
    handleLabel: 'PlayFab Player ID',
  ),
  PlatformConnectorPreset(
    id: 'UNITY_GAMING_SERVICES',
    platform: 'MOBILE',
    label: 'Unity Gaming Services (UGS) Leaderboards',
    description: 'Read player ranks & scores from Unity Gaming Services.',
    defaultBaseUrl: 'https://leaderboards.services.api.unity.com',
    defaultPlayerStatsPath:
        '/v1/projects/PROJECT_ID/leaderboards/MAIN/scores/players/{playerId}',
    defaultMatchResultPath: '/v1/projects/PROJECT_ID/matches/{matchId}',
    defaultAuthType: 'BEARER_TOKEN',
    launchHint: 'com.studio.yourgame',
    handleLabel: 'Unity Player ID',
  ),
  PlatformConnectorPreset(
    id: 'GOOGLE_PLAY_GAMES',
    platform: 'MOBILE',
    label: 'Google Play Games Services REST API',
    description: 'Verify Android player scores via Google Play Games API.',
    defaultBaseUrl: 'https://games.googleapis.com/games/v1',
    defaultPlayerStatsPath: '/players/{playerId}',
    defaultMatchResultPath: '/leaderboards/BOARD_ID/scores/PUBLIC',
    defaultAuthType: 'BEARER_TOKEN',
    launchHint: 'com.studio.yourgame',
    handleLabel: 'Google Play Player ID',
  ),

  // Web Connectors
  PlatformConnectorPreset(
    id: 'WEB_CUSTOM_REST',
    platform: 'WEB',
    label: 'Custom Web Game REST / JSON API',
    description: 'Fetch stats directly from your browser game API endpoint.',
    defaultBaseUrl: 'https://api.yourwebgame.com',
    defaultPlayerStatsPath: '/players/{playerId}/stats',
    defaultMatchResultPath: '/matches/{matchId}',
    defaultAuthType: 'NONE',
    launchHint: 'https://play.yourwebgame.com/room/{matchId}',
    handleLabel: 'Web Username / Handle',
  ),
];

List<PlatformConnectorPreset> presetsForPlatform(String platform) {
  final upper = platform.toUpperCase();
  if (upper == 'ALL') return platformConnectorPresets;
  return platformConnectorPresets.where((p) => p.platform == upper).toList();
}

class PlatformApiConfig {
  final String platform; // 'PC' | 'CONSOLE' | 'MOBILE' | 'WEB' | 'ALL'
  final String providerPreset;
  final String baseUrl;
  final String playerStatsPath;
  final String matchResultPath;
  final String httpMethod; // 'GET' | 'POST'
  final String authType; // 'NONE' | 'API_KEY_HEADER' | 'BEARER_TOKEN' | 'QUERY_PARAM'
  final String authHeaderName;
  final String authParamName;
  final bool hasSecret;
  final String secretHint;
  final String? authSecretInput; // Write-only when saving/testing
  final String launchUriOrPackage;

  const PlatformApiConfig({
    required this.platform,
    this.providerPreset = 'CUSTOM_REST',
    this.baseUrl = '',
    this.playerStatsPath = '',
    this.matchResultPath = '',
    this.httpMethod = 'GET',
    this.authType = 'NONE',
    this.authHeaderName = 'X-API-Key',
    this.authParamName = 'api_key',
    this.hasSecret = false,
    this.secretHint = '',
    this.authSecretInput,
    this.launchUriOrPackage = '',
  });

  factory PlatformApiConfig.fromJson(Map<String, dynamic> j) {
    return PlatformApiConfig(
      platform: (j['platform'] as String?) ?? 'PC',
      providerPreset: (j['providerPreset'] as String?) ?? 'CUSTOM_REST',
      baseUrl: (j['baseUrl'] as String?) ?? '',
      playerStatsPath: (j['playerStatsPath'] as String?) ?? '',
      matchResultPath: (j['matchResultPath'] as String?) ?? '',
      httpMethod: (j['httpMethod'] as String?) ?? 'GET',
      authType: (j['authType'] as String?) ?? 'NONE',
      authHeaderName: (j['authHeaderName'] as String?) ?? 'X-API-Key',
      authParamName: (j['authParamName'] as String?) ?? 'api_key',
      hasSecret: j['hasSecret'] == true,
      secretHint: (j['secretHint'] as String?) ?? '',
      launchUriOrPackage: (j['launchUriOrPackage'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toPayload() {
    return {
      'platform': platform,
      'providerPreset': providerPreset,
      'baseUrl': baseUrl.trim(),
      'playerStatsPath': playerStatsPath.trim(),
      'matchResultPath': matchResultPath.trim(),
      'httpMethod': httpMethod,
      'authType': authType,
      'authHeaderName': authHeaderName.trim(),
      'authParamName': authParamName.trim(),
      if (authSecretInput != null && authSecretInput!.trim().isNotEmpty)
        'authSecret': authSecretInput!.trim(),
      'launchUriOrPackage': launchUriOrPackage.trim(),
    };
  }

  PlatformApiConfig copyWith({
    String? platform,
    String? providerPreset,
    String? baseUrl,
    String? playerStatsPath,
    String? matchResultPath,
    String? httpMethod,
    String? authType,
    String? authHeaderName,
    String? authParamName,
    bool? hasSecret,
    String? secretHint,
    String? authSecretInput,
    String? launchUriOrPackage,
  }) {
    return PlatformApiConfig(
      platform: platform ?? this.platform,
      providerPreset: providerPreset ?? this.providerPreset,
      baseUrl: baseUrl ?? this.baseUrl,
      playerStatsPath: playerStatsPath ?? this.playerStatsPath,
      matchResultPath: matchResultPath ?? this.matchResultPath,
      httpMethod: httpMethod ?? this.httpMethod,
      authType: authType ?? this.authType,
      authHeaderName: authHeaderName ?? this.authHeaderName,
      authParamName: authParamName ?? this.authParamName,
      hasSecret: hasSecret ?? this.hasSecret,
      secretHint: secretHint ?? this.secretHint,
      authSecretInput: authSecretInput ?? this.authSecretInput,
      launchUriOrPackage: launchUriOrPackage ?? this.launchUriOrPackage,
    );
  }
}

class StatsFieldMapping {
  final String scorePath;
  final String winsPath;
  final String lossesPath;
  final String killsPath;
  final String rankPath;
  final String winnerPath;

  const StatsFieldMapping({
    this.scorePath = '',
    this.winsPath = '',
    this.lossesPath = '',
    this.killsPath = '',
    this.rankPath = '',
    this.winnerPath = '',
  });

  factory StatsFieldMapping.fromJson(Map<String, dynamic>? j) {
    if (j == null) return const StatsFieldMapping();
    return StatsFieldMapping(
      scorePath: (j['scorePath'] as String?) ?? '',
      winsPath: (j['winsPath'] as String?) ?? '',
      lossesPath: (j['lossesPath'] as String?) ?? '',
      killsPath: (j['killsPath'] as String?) ?? '',
      rankPath: (j['rankPath'] as String?) ?? '',
      winnerPath: (j['winnerPath'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'scorePath': scorePath.trim(),
        'winsPath': winsPath.trim(),
        'lossesPath': lossesPath.trim(),
        'killsPath': killsPath.trim(),
        'rankPath': rankPath.trim(),
        'winnerPath': winnerPath.trim(),
      };
}

class DeveloperGame {
  final String id;
  final String ownerUserId;
  final String ownerEmail;
  final String ownerUsername;
  final String studioName;
  final String title;
  final String shortName;
  final String tagline;
  final String gameType;
  final List<String> platforms;
  final String posterUrl;
  final String gamertagLabel;
  final String gamertagPlaceholder;
  final bool unifiedApi;
  final List<PlatformApiConfig> platformApis;
  final StatsFieldMapping statsMapping;
  final String status; // 'VERIFIED_LIVE' | 'CONFIGURED'
  final String? lastVerifiedAt;
  final int? lastLatencyMs;
  final String createdAt;
  final String updatedAt;

  const DeveloperGame({
    required this.id,
    required this.ownerUserId,
    required this.ownerEmail,
    required this.ownerUsername,
    required this.studioName,
    required this.title,
    required this.shortName,
    required this.tagline,
    required this.gameType,
    required this.platforms,
    required this.posterUrl,
    required this.gamertagLabel,
    required this.gamertagPlaceholder,
    required this.unifiedApi,
    required this.platformApis,
    required this.statsMapping,
    required this.status,
    this.lastVerifiedAt,
    this.lastLatencyMs,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isVerified => status == 'VERIFIED_LIVE';

  PlatformApiConfig? apiForPlatform(String platform) {
    final upper = platform.toUpperCase();
    for (final a in platformApis) {
      if (a.platform.toUpperCase() == upper) return a;
    }
    for (final a in platformApis) {
      if (a.platform.toUpperCase() == 'ALL') return a;
    }
    return platformApis.isNotEmpty ? platformApis.first : null;
  }

  factory DeveloperGame.fromJson(Map<String, dynamic> j) {
    final rawPlatforms = (j['platforms'] as List<dynamic>?)
            ?.map((e) => e.toString().toUpperCase())
            .toList() ??
        const ['PC'];
    final rawApis = (j['platformApis'] as List<dynamic>?)
            ?.whereType<Map<String, dynamic>>()
            .map(PlatformApiConfig.fromJson)
            .toList() ??
        const [];
    return DeveloperGame(
      id: (j['id'] as String?) ?? '',
      ownerUserId: (j['ownerUserId'] as String?) ?? '',
      ownerEmail: (j['ownerEmail'] as String?) ?? '',
      ownerUsername: (j['ownerUsername'] as String?) ?? '',
      studioName: (j['studioName'] as String?) ?? 'Independent Studio',
      title: (j['title'] as String?) ?? 'Untitled Game',
      shortName: (j['shortName'] as String?) ?? 'GAME',
      tagline: (j['tagline'] as String?) ?? 'API-Integrated Competitive Title',
      gameType: (j['gameType'] as String?) ?? 'HEAD_TO_HEAD',
      platforms: rawPlatforms,
      posterUrl: (j['posterUrl'] as String?) ?? '',
      gamertagLabel: (j['gamertagLabel'] as String?) ?? 'Player ID',
      gamertagPlaceholder:
          (j['gamertagPlaceholder'] as String?) ?? 'Enter in-game ID',
      unifiedApi: j['unifiedApi'] == true,
      platformApis: rawApis,
      statsMapping: StatsFieldMapping.fromJson(
        j['statsMapping'] is Map<String, dynamic>
            ? j['statsMapping'] as Map<String, dynamic>
            : null,
      ),
      status: (j['status'] as String?) ?? 'CONFIGURED',
      lastVerifiedAt: j['lastVerifiedAt'] as String?,
      lastLatencyMs: (j['lastLatencyMs'] as num?)?.toInt(),
      createdAt: (j['createdAt'] as String?) ?? '',
      updatedAt: (j['updatedAt'] as String?) ?? '',
    );
  }

  /// Converts this API-configured developer title into an `OfficialGame` entry
  /// so it integrates seamlessly into the Arena Catalog, Switcher, Duels & Matchrooms.
  OfficialGame toOfficialGame() {
    final primary = platforms.isNotEmpty ? platforms.first : 'PC';
    final mobileApi = apiForPlatform('MOBILE');
    final pcApi = apiForPlatform('PC');
    final anyLaunch = platformApis
        .map((a) => a.launchUriOrPackage)
        .firstWhere((v) => v.isNotEmpty, orElse: () => '');

    return OfficialGame(
      id: id,
      uuid: id,
      displayName: title,
      shortName: shortName,
      tagline: tagline.isNotEmpty ? tagline : 'By $studioName · Live Stats API',
      primaryPlatform: primary,
      platforms: platforms,
      gameType: gameType,
      posterNetworkUrl: posterUrl.isNotEmpty ? posterUrl : null,
      bannerNetworkUrl: posterUrl.isNotEmpty ? posterUrl : null,
      androidPackageId: (mobileApi != null &&
              mobileApi.launchUriOrPackage.contains('.') &&
              !mobileApi.launchUriOrPackage.contains('://'))
          ? mobileApi.launchUriOrPackage
          : null,
      launchUri: (pcApi != null && pcApi.launchUriOrPackage.contains('://'))
          ? pcApi.launchUriOrPackage
          : (anyLaunch.contains('://') ? anyLaunch : null),
      gamertagLabel: gamertagLabel,
      gamertagPlaceholder: gamertagPlaceholder,
      gradientColors: const [Color(0xFF4C1D95), Color(0xFF1E1B4B)],
      isDeveloperApiGame: true,
      studioName: studioName,
    );
  }
}

class LiveStatsFetchResult {
  final bool ok;
  final int statusCode;
  final int latencyMs;
  final String resolvedUrl;
  final String platform;
  final Map<String, dynamic> extractedStats;
  final bool isJson;
  final String rawPreview;
  final String? error;

  const LiveStatsFetchResult({
    required this.ok,
    required this.statusCode,
    required this.latencyMs,
    required this.resolvedUrl,
    required this.platform,
    required this.extractedStats,
    required this.isJson,
    required this.rawPreview,
    this.error,
  });

  factory LiveStatsFetchResult.fromJson(Map<String, dynamic> j) {
    return LiveStatsFetchResult(
      ok: j['ok'] == true,
      statusCode: (j['statusCode'] as num?)?.toInt() ?? 0,
      latencyMs: (j['latencyMs'] as num?)?.toInt() ?? 0,
      resolvedUrl: (j['resolvedUrl'] as String?) ?? '',
      platform: (j['platform'] as String?) ?? '',
      extractedStats: j['extractedStats'] is Map
          ? Map<String, dynamic>.from(j['extractedStats'] as Map)
          : const {},
      isJson: j['isJson'] == true,
      rawPreview: (j['rawPreview'] as String?) ?? '',
      error: j['error'] as String?,
    );
  }
}
