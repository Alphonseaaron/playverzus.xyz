import 'package:flutter/material.dart';

enum GamePlatformFilter { all, pc, console, mobile }

class OfficialGame {
  final String id;
  final String uuid;
  final String displayName;
  final String shortName;
  final String tagline;
  final String primaryPlatform;
  final List<String> platforms;
  final String gameType;
  final String? posterAsset;
  final String? posterNetworkUrl;
  final String? bannerAsset;
  final String? bannerNetworkUrl;
  final String? transparentLogoAsset;
  final String? androidPackageId;
  final String? windowsProcessName;
  final String? launchUri;
  final String gamertagLabel;
  final String gamertagPlaceholder;
  final List<Color> gradientColors;
  final bool isDeveloperApiGame;
  final String? studioName;

  const OfficialGame({
    required this.id,
    required this.uuid,
    required this.displayName,
    required this.shortName,
    required this.tagline,
    required this.primaryPlatform,
    required this.platforms,
    required this.gameType,
    this.posterAsset,
    this.posterNetworkUrl,
    this.bannerAsset,
    this.bannerNetworkUrl,
    this.transparentLogoAsset,
    this.androidPackageId,
    this.windowsProcessName,
    this.launchUri,
    required this.gamertagLabel,
    required this.gamertagPlaceholder,
    required this.gradientColors,
    this.isDeveloperApiGame = false,
    this.studioName,
  });

  /// Canonical deep-link / launcher URI for force auto-launching the game.
  String? get effectiveLaunchUri {
    if (launchUri != null && launchUri!.isNotEmpty) return launchUri;
    switch (id) {
      case 'cs2':
        return 'steam://rungameid/730';
      case 'apex':
        return 'steam://rungameid/1172470';
      case 'marvelrivals':
        return 'steam://rungameid/2767030';
      case 'rl':
        return 'steam://rungameid/252950';
      case 'cod':
        return 'steam://rungameid/1938090';
      case 'tekken8':
        return 'steam://rungameid/1778820';
      case 'mk11':
        return 'steam://rungameid/976310';
      case 'dota2':
        return 'steam://rungameid/570';
      case 'pubgpc':
        return 'steam://rungameid/578080';
      case 'efootball':
        return 'steam://rungameid/1665460';
      case 'eafc':
        return 'origin2://game/launch/?offerIds=eafc27';
      case 'fortnite':
        return 'com.epicgames.launcher://apps/Fortnite?action=launch&silent=true';
      case 'val':
        return 'riotclient://launch?product=valorant';
      case 'lol':
        return 'riotclient://launch?product=league_of_legends';
      case 'chess':
        return 'https://www.chess.com/play/online';
      default:
        return androidPackageId != null
            ? 'android-app://$androidPackageId'
            : null;
    }
  }

  bool matchesPlatformFilter(GamePlatformFilter filter) {
    if (filter == GamePlatformFilter.all) return true;
    final upper = platforms.map((p) => p.toUpperCase()).toList();
    switch (filter) {
      case GamePlatformFilter.pc:
        return upper.contains('PC') ||
            upper.contains('WEB') ||
            upper.contains('UNIVERSAL') ||
            primaryPlatform == 'PC' ||
            primaryPlatform == 'WEB';
      case GamePlatformFilter.console:
        return upper.any((p) => const [
                  'CONSOLE',
                  'PS5',
                  'PLAYSTATION',
                  'XBOX',
                  'SWITCH',
                  'UNIVERSAL'
                ].contains(p)) ||
            primaryPlatform == 'CONSOLE';
      case GamePlatformFilter.mobile:
        return upper.any((p) => const [
                  'MOBILE',
                  'ANDROID',
                  'IOS',
                  'EMULATOR',
                  'UNIVERSAL'
                ].contains(p)) ||
            primaryPlatform == 'MOBILE';
      case GamePlatformFilter.all:
        return true;
    }
  }

  String get platformSummary =>
      platforms.isNotEmpty ? platforms.take(3).join(' · ') : primaryPlatform;
}

/// Complete, canonical 21-game Playverzus Esports Roster.
/// Matches apps/web/src/lib/gamesCatalog.ts and apps/api game-profile seeds 1:1.
const List<OfficialGame> officialGames = [
  OfficialGame(
    id: 'cs2',
    uuid: '00000000-0000-0000-0000-000000000001',
    displayName: 'Counter-Strike 2',
    shortName: 'CS2',
    tagline: '1v1 Aim & Tactical Defuse Combat',
    primaryPlatform: 'PC',
    platforms: ['PC'],
    gameType: 'HEAD_TO_HEAD',
    posterAsset: 'assets/games/cs2_poster.jpg',
    bannerAsset: 'assets/games/cs2_banner.jpg',
    windowsProcessName: 'cs2.exe',
    gamertagLabel: 'Steam ID / Friend Code',
    gamertagPlaceholder: 'e.g. 76561198... or s1mple',
    gradientColors: [Color(0xFFD97706), Color(0xFF451A03)],
  ),
  OfficialGame(
    id: 'eafc',
    uuid: '00000000-0000-0000-0000-000000000002',
    displayName: 'EA Sports FC 27',
    shortName: 'FC27',
    tagline: '1v1 Competitive Football Matches',
    primaryPlatform: 'CONSOLE',
    platforms: ['PC', 'PS5', 'XBOX'],
    gameType: 'HEAD_TO_HEAD',
    posterAsset: 'assets/games/fc27_poster.jpg',
    bannerAsset: 'assets/games/fc27_banner.jpg',
    windowsProcessName: 'FC27.exe',
    gamertagLabel: 'EA ID / PSN Handle',
    gamertagPlaceholder: 'e.g. ProStriker_99',
    gradientColors: [Color(0xFF047857), Color(0xFF064E3B)],
  ),
  OfficialGame(
    id: 'eafcm',
    uuid: '00000000-0000-0000-0000-000000000019',
    displayName: 'EA Sports FC Mobile',
    shortName: 'FCM',
    tagline: '1v1 Competitive Mobile Football Duels',
    primaryPlatform: 'MOBILE',
    platforms: ['MOBILE', 'ANDROID', 'IOS'],
    gameType: 'HEAD_TO_HEAD',
    posterAsset: 'assets/games/eafcm_poster.jpg',
    bannerAsset: 'assets/games/eafcm_banner.jpg',
    transparentLogoAsset: 'assets/games/fcm_logo_hd_transparent.png',
    androidPackageId: 'com.ea.gp.fifamobile',
    gamertagLabel: 'EA ID / In-Game Name',
    gamertagPlaceholder: 'e.g. FCM_Striker99',
    gradientColors: [Color(0xFF059669), Color(0xFF022C22)],
  ),
  OfficialGame(
    id: 'apex',
    uuid: '00000000-0000-0000-0000-000000000010',
    displayName: 'Apex Legends',
    shortName: 'APEX',
    tagline: 'High-Octane Battle Royale & Arenas',
    primaryPlatform: 'PC',
    platforms: ['PC', 'CONSOLE'],
    gameType: 'HEAD_TO_HEAD',
    posterAsset: 'assets/games/apex_poster.jpg',
    bannerAsset: 'assets/games/apex_banner.jpg',
    windowsProcessName: 'r5apex.exe',
    gamertagLabel: 'EA ID / Gamertag',
    gamertagPlaceholder: 'e.g. ImperialHal',
    gradientColors: [Color(0xFFDC2626), Color(0xFF450A0A)],
  ),
  OfficialGame(
    id: 'marvelrivals',
    uuid: '00000000-0000-0000-0000-000000000011',
    displayName: 'Marvel Rivals',
    shortName: 'RIVALS',
    tagline: '6v6 Super Hero Team PvP Shooter',
    primaryPlatform: 'PC',
    platforms: ['PC', 'PLAYSTATION', 'XBOX'],
    gameType: 'BINARY_RESULT',
    posterNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/2767030/library_600x900_2x.jpg',
    bannerNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/2767030/library_hero.jpg',
    windowsProcessName: 'Marvel-Win64-Shipping.exe',
    gamertagLabel: 'Marvel Rivals UID',
    gamertagPlaceholder: 'e.g. Rivals_Star',
    gradientColors: [Color(0xFF4F46E5), Color(0xFF1E1B4B)],
  ),
  OfficialGame(
    id: 'rl',
    uuid: '00000000-0000-0000-0000-000000000003',
    displayName: 'Rocket League',
    shortName: 'RL',
    tagline: '1v1 & 2v2 Supersonic Soccar Duels',
    primaryPlatform: 'PC',
    platforms: ['PC', 'PLAYSTATION', 'XBOX', 'SWITCH'],
    gameType: 'HEAD_TO_HEAD',
    posterNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/252950/library_600x900_2x.jpg',
    bannerNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/252950/library_hero.jpg',
    windowsProcessName: 'RocketLeague.exe',
    gamertagLabel: 'Epic Games ID',
    gamertagPlaceholder: 'e.g. Zen_RL',
    gradientColors: [Color(0xFF2563EB), Color(0xFF172554)],
  ),
  OfficialGame(
    id: 'val',
    uuid: '00000000-0000-0000-0000-000000000004',
    displayName: 'Valorant',
    shortName: 'VAL',
    tagline: '5v5 & 1v1 Tactical Agent Showdowns',
    primaryPlatform: 'PC',
    platforms: ['PC', 'PLAYSTATION', 'XBOX'],
    gameType: 'BINARY_RESULT',
    posterAsset: 'assets/games/valorant_poster.jpg',
    bannerAsset: 'assets/games/valorant_banner.jpg',
    windowsProcessName: 'VALORANT-Win64-Shipping.exe',
    gamertagLabel: 'Riot ID (Name#TAG)',
    gamertagPlaceholder: 'e.g. TenZ#NA1',
    gradientColors: [Color(0xFFE11D48), Color(0xFF4C0519)],
  ),
  OfficialGame(
    id: 'cod',
    uuid: '00000000-0000-0000-0000-000000000006',
    displayName: 'Call of Duty: Warzone',
    shortName: 'WZ',
    tagline: 'Kill Race & Gulag 1v1 Tournaments',
    primaryPlatform: 'PC',
    platforms: ['PC', 'PLAYSTATION', 'XBOX'],
    gameType: 'HEAD_TO_HEAD',
    posterNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/1938090/library_600x900_2x.jpg',
    bannerNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/1938090/library_hero.jpg',
    windowsProcessName: 'cod.exe',
    gamertagLabel: 'Activision ID',
    gamertagPlaceholder: 'e.g. Scump#1234567',
    gradientColors: [Color(0xFF475569), Color(0xFF0F172A)],
  ),
  OfficialGame(
    id: 'tekken8',
    uuid: '00000000-0000-0000-0000-000000000008',
    displayName: 'Tekken 8',
    shortName: 'TK8',
    tagline: 'Iron Fist 1v1 Fighting Championships',
    primaryPlatform: 'CONSOLE',
    platforms: ['PC', 'PLAYSTATION', 'XBOX'],
    gameType: 'BINARY_RESULT',
    posterNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/1778820/library_600x900_2x.jpg',
    bannerNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/1778820/library_hero.jpg',
    windowsProcessName: 'Polaris-Win64-Shipping.exe',
    gamertagLabel: 'Tekken ID / PSN',
    gamertagPlaceholder: 'e.g. ArslanAsh',
    gradientColors: [Color(0xFF9333EA), Color(0xFF3B0764)],
  ),
  OfficialGame(
    id: 'mk11',
    uuid: '00000000-0000-0000-0000-000000000021',
    displayName: 'Mortal Kombat 11',
    shortName: 'MK11',
    tagline: 'Brutal 1v1 Kombat Ladder Matches',
    primaryPlatform: 'CONSOLE',
    platforms: ['PC', 'PLAYSTATION', 'XBOX', 'SWITCH'],
    gameType: 'BINARY_RESULT',
    posterNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/976310/library_600x900_2x.jpg',
    bannerNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/976310/library_hero.jpg',
    windowsProcessName: 'MK11.exe',
    gamertagLabel: 'WB Games ID / PSN',
    gamertagPlaceholder: 'e.g. SonicFox',
    gradientColors: [Color(0xFFB45309), Color(0xFF451A03)],
  ),
  OfficialGame(
    id: 'fortnite',
    uuid: '00000000-0000-0000-0000-000000000007',
    displayName: 'Fortnite',
    shortName: 'FN',
    tagline: 'Box Fights, Zone Wars & Zero Build',
    primaryPlatform: 'PC',
    platforms: ['PC', 'PLAYSTATION', 'XBOX', 'MOBILE'],
    gameType: 'BINARY_RESULT',
    posterAsset: 'assets/games/fortnite_poster.jpg',
    bannerAsset: 'assets/games/fortnite_banner.jpg',
    androidPackageId: 'com.epicgames.fortnite',
    windowsProcessName: 'FortniteClient-Win64-Shipping.exe',
    gamertagLabel: 'Epic Games ID',
    gamertagPlaceholder: 'e.g. Mongraal',
    gradientColors: [Color(0xFF0284C7), Color(0xFF082F49)],
  ),
  OfficialGame(
    id: 'lol',
    uuid: '00000000-0000-0000-0000-000000000012',
    displayName: 'League of Legends',
    shortName: 'LOL',
    tagline: '1v1 Mid-Lane & Summoner’s Rift Duels',
    primaryPlatform: 'PC',
    platforms: ['PC'],
    gameType: 'BINARY_RESULT',
    posterAsset: 'assets/games/lol_poster.jpg',
    bannerAsset: 'assets/games/lol_banner.jpg',
    windowsProcessName: 'League of Legends.exe',
    gamertagLabel: 'Riot ID (Name#TAG)',
    gamertagPlaceholder: 'e.g. Faker#KR1',
    gradientColors: [Color(0xFF0E7490), Color(0xFF083344)],
  ),
  OfficialGame(
    id: 'dota2',
    uuid: '00000000-0000-0000-0000-000000000005',
    displayName: 'Dota 2',
    shortName: 'DOTA2',
    tagline: '1v1 Solo Mid & Captain’s Mode',
    primaryPlatform: 'PC',
    platforms: ['PC'],
    gameType: 'BINARY_RESULT',
    posterNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/570/library_600x900_2x.jpg',
    bannerNetworkUrl:
        'https://cdn.cloudflare.steamstatic.com/steam/apps/570/library_hero.jpg',
    windowsProcessName: 'dota2.exe',
    gamertagLabel: 'Steam ID / Friend Code',
    gamertagPlaceholder: 'e.g. 89234102',
    gradientColors: [Color(0xFF991B1B), Color(0xFF450A0A)],
  ),
  OfficialGame(
    id: 'mlbb',
    uuid: '00000000-0000-0000-0000-000000000013',
    displayName: 'Mobile Legends: Bang Bang',
    shortName: 'MLBB',
    tagline: 'Mobile MOBA 1v1 & 5v5 Showdowns',
    primaryPlatform: 'MOBILE',
    platforms: ['MOBILE', 'ANDROID', 'IOS'],
    gameType: 'BINARY_RESULT',
    posterAsset: 'assets/games/mlbb_poster.jpg',
    bannerAsset: 'assets/games/mlbb_banner.jpg',
    androidPackageId: 'com.mobile.legends',
    gamertagLabel: 'MLBB User ID (Server ID)',
    gamertagPlaceholder: 'e.g. 12345678 (2041)',
    gradientColors: [Color(0xFF1D4ED8), Color(0xFF1E1B4B)],
  ),
  OfficialGame(
    id: 'subway',
    uuid: '11111111-1111-1111-1111-111111111111',
    displayName: 'Subway Surfers',
    shortName: 'SUBWAY',
    tagline: 'High-Score Speedrun Head-to-Head',
    primaryPlatform: 'MOBILE',
    platforms: ['MOBILE', 'ANDROID', 'IOS', 'WEB'],
    gameType: 'HIGH_SCORE',
    posterAsset: 'assets/games/subway_poster.jpg',
    bannerAsset: 'assets/games/subway_banner.jpg',
    androidPackageId: 'com.kiloo.subwaysurf',
    gamertagLabel: 'Runner Handle',
    gamertagPlaceholder: 'e.g. Runner_007',
    gradientColors: [Color(0xFFEA580C), Color(0xFF431407)],
  ),
  OfficialGame(
    id: 'chess',
    uuid: '00000000-0000-0000-0000-000000000009',
    displayName: 'Chess.com',
    shortName: 'CHESS',
    tagline: 'Blitz, Bullet & Rapid Grandmaster Duels',
    primaryPlatform: 'PC',
    platforms: ['PC', 'MOBILE', 'WEB'],
    gameType: 'BINARY_RESULT',
    posterAsset: 'assets/games/chess_poster.jpg',
    bannerAsset: 'assets/games/chess_banner.jpg',
    androidPackageId: 'com.chess',
    gamertagLabel: 'Chess.com Username',
    gamertagPlaceholder: 'e.g. MagnusC',
    gradientColors: [Color(0xFF65A30D), Color(0xFF1A2E05)],
  ),
  OfficialGame(
    id: 'pubgm',
    uuid: '00000000-0000-0000-0000-000000000014',
    displayName: 'PUBG Mobile',
    shortName: 'PUBGM',
    tagline: 'TDM 1v1 Warehouse & Kill-Race Cups',
    primaryPlatform: 'MOBILE',
    platforms: ['MOBILE', 'ANDROID', 'IOS'],
    gameType: 'HEAD_TO_HEAD',
    posterAsset: 'assets/games/pubgm_poster.jpg',
    bannerAsset: 'assets/games/pubgm_banner.jpg',
    androidPackageId: 'com.tencent.ig',
    gamertagLabel: 'PUBG Character ID / IGN',
    gamertagPlaceholder: 'e.g. 5123456789 (Mortal)',
    gradientColors: [Color(0xFFCA8A04), Color(0xFF422006)],
  ),
  OfficialGame(
    id: 'pubgpc',
    uuid: '00000000-0000-0000-0000-000000000015',
    displayName: 'PUBG: BATTLEGROUNDS',
    shortName: 'PUBG',
    tagline: 'Tactical Battle Royale Kill Challenges',
    primaryPlatform: 'PC',
    platforms: ['PC', 'PS5', 'XBOX'],
    gameType: 'HEAD_TO_HEAD',
    posterAsset: 'assets/games/pubgpc_poster.jpg',
    bannerAsset: 'assets/games/pubgpc_banner.jpg',
    windowsProcessName: 'TslGame.exe',
    gamertagLabel: 'Steam ID / PUBG IGN',
    gamertagPlaceholder: 'e.g. TGLTN',
    gradientColors: [Color(0xFFA16207), Color(0xFF292524)],
  ),
  OfficialGame(
    id: 'efootballm',
    uuid: '00000000-0000-0000-0000-000000000017',
    displayName: 'eFootball Mobile',
    shortName: 'EFM',
    tagline: 'Competitive 1v1 Mobile Football',
    primaryPlatform: 'MOBILE',
    platforms: ['MOBILE', 'ANDROID', 'IOS'],
    gameType: 'HEAD_TO_HEAD',
    posterAsset: 'assets/games/efootballm_poster.jpg',
    bannerAsset: 'assets/games/efootballm_banner.jpg',
    androidPackageId: 'jp.konami.pesam',
    gamertagLabel: 'Konami ID / Owner Name',
    gamertagPlaceholder: 'e.g. eFoot_Pro',
    gradientColors: [Color(0xFF2563EB), Color(0xFF1E3A8A)],
  ),
  OfficialGame(
    id: 'efootball',
    uuid: '00000000-0000-0000-0000-000000000018',
    displayName: 'eFootball (Console & PC)',
    shortName: 'EFOOT',
    tagline: 'Cross-Play Dream Team 1v1 Duels',
    primaryPlatform: 'CONSOLE',
    platforms: ['PC', 'PS5', 'XBOX'],
    gameType: 'HEAD_TO_HEAD',
    posterAsset: 'assets/games/efootball_poster.jpg',
    bannerAsset: 'assets/games/efootball_banner.jpg',
    windowsProcessName: 'eFootball.exe',
    gamertagLabel: 'Konami ID / PSN / Gamertag',
    gamertagPlaceholder: 'e.g. Konami_Champ',
    gradientColors: [Color(0xFF1D4ED8), Color(0xFF0F172A)],
  ),
  OfficialGame(
    id: '8ballpool',
    uuid: '00000000-0000-0000-0000-000000000020',
    displayName: '8 Ball Pool',
    shortName: '8BP',
    tagline: 'Instant 1v1 Billiards Cash Matches',
    primaryPlatform: 'MOBILE',
    platforms: ['MOBILE', 'ANDROID', 'IOS', 'WEB'],
    gameType: 'BINARY_RESULT',
    posterAsset: 'assets/games/8ballpool_poster.jpg',
    bannerAsset: 'assets/games/8ballpool_banner.jpg',
    androidPackageId: 'com.miniclip.eightballpool',
    gamertagLabel: 'Miniclip Unique ID',
    gamertagPlaceholder: 'e.g. 192-834-01',
    gradientColors: [Color(0xFF0F766E), Color(0xFF042F2E)],
  ),
];

OfficialGame findOfficialGameById(String? rawId) {
  if (rawId == null || rawId.isEmpty) return officialGames[1]; // Default FC 27
  final lower = rawId.toLowerCase().trim();
  for (final g in officialGames) {
    if (g.id.toLowerCase() == lower ||
        g.uuid.toLowerCase() == lower ||
        g.shortName.toLowerCase() == lower ||
        g.displayName.toLowerCase() == lower) {
      return g;
    }
  }
  return officialGames[1];
}
