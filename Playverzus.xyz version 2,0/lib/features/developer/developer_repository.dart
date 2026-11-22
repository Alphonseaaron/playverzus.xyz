import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/catalog/official_games.dart';
import '../../core/network/api_client.dart';
import '../../core/network/friendly_errors.dart';
import 'developer_models.dart';

class DeveloperGamesState {
  final bool loading;
  final List<DeveloperGame> games;
  final String? error;

  const DeveloperGamesState({
    this.loading = false,
    this.games = const [],
    this.error,
  });

  DeveloperGamesState copyWith({
    bool? loading,
    List<DeveloperGame>? games,
    String? error,
    bool clearError = false,
  }) {
    return DeveloperGamesState(
      loading: loading ?? this.loading,
      games: games ?? this.games,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class DeveloperGamesNotifier extends StateNotifier<DeveloperGamesState> {
  DeveloperGamesNotifier() : super(const DeveloperGamesState()) {
    refresh();
  }

  Future<void> refresh() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final res = await ApiClient.get('/developer/games');
      final list = (res is Map && res['games'] is List)
          ? (res['games'] as List)
              .whereType<Map<String, dynamic>>()
              .map(DeveloperGame.fromJson)
              .toList()
          : const <DeveloperGame>[];
      state = DeveloperGamesState(loading: false, games: list);
    } on ApiException catch (e) {
      state = state.copyWith(loading: false, error: e.message);
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: FriendlyError.humanize(e),
      );
    }
  }

  Future<({DeveloperGame? game, String? error})> createGame(
    Map<String, dynamic> payload,
  ) async {
    try {
      final res = await ApiClient.post('/developer/games', data: payload);
      if (res is Map && res['game'] is Map<String, dynamic>) {
        final created =
            DeveloperGame.fromJson(res['game'] as Map<String, dynamic>);
        state = state.copyWith(
          games: [created, ...state.games.where((g) => g.id != created.id)],
          clearError: true,
        );
        return (game: created, error: null);
      }
      await refresh();
      return (game: null, error: null);
    } on ApiException catch (e) {
      return (game: null, error: e.message);
    } catch (e) {
      return (game: null, error: FriendlyError.humanize(e));
    }
  }

  Future<({DeveloperGame? game, String? error})> updateGame(
    String gameId,
    Map<String, dynamic> payload,
  ) async {
    try {
      final res =
          await ApiClient.patch('/developer/games/$gameId', data: payload);
      if (res is Map && res['game'] is Map<String, dynamic>) {
        final updated =
            DeveloperGame.fromJson(res['game'] as Map<String, dynamic>);
        state = state.copyWith(
          games: state.games
              .map((g) => g.id == updated.id ? updated : g)
              .toList(),
          clearError: true,
        );
        return (game: updated, error: null);
      }
      await refresh();
      return (game: null, error: null);
    } on ApiException catch (e) {
      return (game: null, error: e.message);
    } catch (e) {
      return (game: null, error: FriendlyError.humanize(e));
    }
  }

  Future<String?> deleteGame(String gameId) async {
    try {
      await ApiClient.delete('/developer/games/$gameId');
      state = state.copyWith(
        games: state.games.where((g) => g.id != gameId).toList(),
      );
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return FriendlyError.humanize(e);
    }
  }

  /// Runs a real server-side live stats fetch against either a saved gameId or draft API config.
  Future<LiveStatsFetchResult> testFetchStats({
    String? gameId,
    PlatformApiConfig? apiConfig,
    required StatsFieldMapping statsMapping,
    required String platform,
    required String playerId,
    String matchId = '',
    String mode = 'player',
  }) async {
    try {
      final res = await ApiClient.post('/developer/test-fetch', data: {
        if (gameId != null && gameId.isNotEmpty) 'gameId': gameId,
        if (apiConfig != null) 'apiConfig': apiConfig.toPayload(),
        'statsMapping': statsMapping.toJson(),
        'platform': platform,
        'playerId': playerId,
        'matchId': matchId,
        'mode': mode,
      });
      if (res is Map<String, dynamic>) {
        final result = LiveStatsFetchResult.fromJson(res);
        if (result.ok && gameId != null && gameId.isNotEmpty) {
          // Refresh list so VERIFIED_LIVE status & latency update immediately
          refresh();
        }
        return result;
      }
      return const LiveStatsFetchResult(
        ok: false,
        statusCode: 500,
        latencyMs: 0,
        resolvedUrl: '',
        platform: '',
        extractedStats: {},
        isJson: false,
        rawPreview: '',
        error: 'Unexpected response from stats engine.',
      );
    } on ApiException catch (e) {
      return LiveStatsFetchResult(
        ok: false,
        statusCode: e.statusCode ?? 400,
        latencyMs: 0,
        resolvedUrl: '',
        platform: platform,
        extractedStats: const {},
        isJson: false,
        rawPreview: '',
        error: e.message,
      );
    } catch (e) {
      return LiveStatsFetchResult(
        ok: false,
        statusCode: 500,
        latencyMs: 0,
        resolvedUrl: '',
        platform: platform,
        extractedStats: const {},
        isJson: false,
        rawPreview: '',
        error: '$e',
      );
    }
  }

  /// Production stats lookup for a saved Developer API game (`GET /developer/games/:id/stats`).
  Future<LiveStatsFetchResult> fetchGamePlayerStats({
    required String gameId,
    required String playerId,
    required String platform,
    String matchId = '',
    String mode = 'player',
  }) async {
    try {
      final res = await ApiClient.get(
        '/developer/games/$gameId/stats',
        queryParameters: {
          'playerId': playerId,
          'platform': platform,
          if (matchId.isNotEmpty) 'matchId': matchId,
          'mode': mode,
        },
      );
      if (res is Map<String, dynamic>) {
        return LiveStatsFetchResult.fromJson(res);
      }
      return const LiveStatsFetchResult(
        ok: false,
        statusCode: 500,
        latencyMs: 0,
        resolvedUrl: '',
        platform: '',
        extractedStats: {},
        isJson: false,
        rawPreview: '',
        error: 'Empty stats response.',
      );
    } on ApiException catch (e) {
      return LiveStatsFetchResult(
        ok: false,
        statusCode: e.statusCode ?? 400,
        latencyMs: 0,
        resolvedUrl: '',
        platform: platform,
        extractedStats: const {},
        isJson: false,
        rawPreview: '',
        error: e.message,
      );
    }
  }
}

final developerGamesProvider =
    StateNotifierProvider<DeveloperGamesNotifier, DeveloperGamesState>((ref) {
  return DeveloperGamesNotifier();
});

/// Unified Catalog: All 21 Official Playverzus Games + All Live Developer API-Configured Games.
final allCatalogGamesProvider = Provider<List<OfficialGame>>((ref) {
  final devGames = ref.watch(developerGamesProvider).games;
  return [
    ...officialGames,
    ...devGames.map((d) => d.toOfficialGame()),
  ];
});

OfficialGame findAnyCatalogGame(List<OfficialGame> catalog, String id) {
  final lower = id.toLowerCase();
  for (final g in catalog) {
    if (g.id.toLowerCase() == lower || g.uuid.toLowerCase() == lower) {
      return g;
    }
  }
  return findOfficialGameById(id);
}
