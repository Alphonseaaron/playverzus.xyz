import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../catalog/official_games.dart';
import '../network/api_client.dart';
import '../storage/app_state.dart';

class ChallengeModel {
  final String id;
  final String roomCode;
  final String gameId;
  final String hostId;
  final String hostName;
  final int hostElo;
  final String mode; // '1V1_OPEN' | 'DIRECT_RIVAL' | 'PRIVATE_ROOM' | 'PARTY_SQUAD'
  final String squadSize; // '1v1' | '2v2' | '3v3' | '5v5'
  final String format; // 'BO1' | 'BO3' | 'BO5'
  final double stakeUsd;
  final bool isCash;
  final String region;
  final String? countryLock;
  final String? invitedOpponent;
  final String? opponentName;
  final String status; // 'OPEN' | 'ACCEPTED' | 'LIVE' | 'SETTLED'

  const ChallengeModel({
    required this.id,
    required this.roomCode,
    required this.gameId,
    this.hostId = '',
    required this.hostName,
    required this.hostElo,
    required this.mode,
    required this.squadSize,
    required this.format,
    required this.stakeUsd,
    required this.isCash,
    required this.region,
    this.countryLock,
    this.invitedOpponent,
    this.opponentName,
    this.status = 'OPEN',
  });

  ChallengeModel copyWith({
    String? opponentName,
    String? status,
  }) {
    return ChallengeModel(
      id: id,
      roomCode: roomCode,
      gameId: gameId,
      hostId: hostId,
      hostName: hostName,
      hostElo: hostElo,
      mode: mode,
      squadSize: squadSize,
      format: format,
      stakeUsd: stakeUsd,
      isCash: isCash,
      region: region,
      countryLock: countryLock,
      invitedOpponent: invitedOpponent,
      opponentName: opponentName ?? this.opponentName,
      status: status ?? this.status,
    );
  }
}

class TournamentEntrant {
  final String username;
  final String countryCode;
  final bool checkedIn;

  const TournamentEntrant({
    required this.username,
    required this.countryCode,
    required this.checkedIn,
  });

  TournamentEntrant copyWith({bool? checkedIn}) => TournamentEntrant(
        username: username,
        countryCode: countryCode,
        checkedIn: checkedIn ?? this.checkedIn,
      );
}

class TournamentModel {
  final String id;
  final String name;
  final String gameId;
  final String format; // SINGLE_ELIM | DOUBLE_ELIM | ROUND_ROBIN | SWISS
  final int size;
  final double entryFeeUsd;
  final double prizePoolUsd;
  final String status; // REGISTRATION | CHECKIN | ACTIVE | COMPLETED
  final bool isBlitz;
  final int tier; // 1..5 for Blitz Sit & Go
  final String region;
  final int apiEnrolledCount;
  final List<TournamentEntrant> entrants;

  const TournamentModel({
    required this.id,
    required this.name,
    required this.gameId,
    required this.format,
    required this.size,
    required this.entryFeeUsd,
    required this.prizePoolUsd,
    required this.status,
    required this.isBlitz,
    this.tier = 1,
    this.region = 'Global',
    this.apiEnrolledCount = 0,
    required this.entrants,
  });

  int get enrolledCount =>
      entrants.length > apiEnrolledCount ? entrants.length : apiEnrolledCount;
  int get slotsLeft => (size - enrolledCount).clamp(0, size);
  bool get isFull => enrolledCount >= size;

  TournamentModel copyWith({
    String? status,
    int? apiEnrolledCount,
    List<TournamentEntrant>? entrants,
  }) {
    return TournamentModel(
      id: id,
      name: name,
      gameId: gameId,
      format: format,
      size: size,
      entryFeeUsd: entryFeeUsd,
      prizePoolUsd: prizePoolUsd,
      status: status ?? this.status,
      isBlitz: isBlitz,
      tier: tier,
      region: region,
      apiEnrolledCount: apiEnrolledCount ?? this.apiEnrolledCount,
      entrants: entrants ?? this.entrants,
    );
  }
}

class ArenaDataState {
  final List<ChallengeModel> challenges;
  final List<ChallengeModel> myMatches;
  final List<TournamentModel> blitzPools;
  final List<TournamentModel> tournaments;
  final bool loading;
  final bool syncedWithApi;
  final String? errorMessage;

  const ArenaDataState({
    this.challenges = const [],
    this.myMatches = const [],
    this.blitzPools = const [],
    this.tournaments = const [],
    this.loading = false,
    this.syncedWithApi = false,
    this.errorMessage,
  });

  ArenaDataState copyWith({
    List<ChallengeModel>? challenges,
    List<ChallengeModel>? myMatches,
    List<TournamentModel>? blitzPools,
    List<TournamentModel>? tournaments,
    bool? loading,
    bool? syncedWithApi,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ArenaDataState(
      challenges: challenges ?? this.challenges,
      myMatches: myMatches ?? this.myMatches,
      blitzPools: blitzPools ?? this.blitzPools,
      tournaments: tournaments ?? this.tournaments,
      loading: loading ?? this.loading,
      syncedWithApi: syncedWithApi ?? this.syncedWithApi,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class ArenaDataNotifier extends StateNotifier<ArenaDataState> {
  final Ref _ref;

  ArenaDataNotifier(this._ref) : super(const ArenaDataState()) {
    // Re-sync automatically whenever the authenticated user changes, and wipe private data on logout
    _ref.listen<PlayerSession>(playerSessionProvider, (prev, next) {
      if (prev?.userId != next.userId ||
          prev?.isAuthenticated != next.isAuthenticated) {
        if (!next.isAuthenticated) {
          state = state.copyWith(
            challenges: const [],
            myMatches: const [],
            clearError: true,
          );
        } else if (next.isPlayer) {
          refreshFromApi();
        }
      }
    });
  }

  /// Fetches live Blitz Pools, Tournaments, Open Challenges, and My Matches from the Playverzus API.
  /// Reports real errors cleanly instead of masking failures with fake records.
  Future<void> refreshFromApi() async {
    final session = _ref.read(playerSessionProvider);
    state = state.copyWith(loading: true, clearError: true);

    List<TournamentModel> nextBlitz = state.blitzPools;
    List<TournamentModel> nextTournaments = state.tournaments;
    List<ChallengeModel> nextOpen = state.challenges;
    List<ChallengeModel> nextMine = state.myMatches;
    final List<String> errors = [];
    bool anySuccess = false;

    // 1. Public Blitz Pools
    try {
      final blitzRes = await ApiClient.get('/tournaments/blitz-pools');
      if (blitzRes is List) {
        anySuccess = true;
        nextBlitz = blitzRes
            .whereType<Map<String, dynamic>>()
            .map(_parseTournamentFromApi)
            .where((t) => t.isBlitz)
            .toList();
      }
    } on ApiException catch (e) {
      errors.add(e.message);
    } catch (_) {}

    // 2. Public Tournaments
    try {
      final tourRes = await ApiClient.get('/tournaments');
      if (tourRes is List) {
        anySuccess = true;
        nextTournaments = tourRes
            .whereType<Map<String, dynamic>>()
            .map(_parseTournamentFromApi)
            .where((t) => !t.isBlitz)
            .toList();
      }
    } on ApiException catch (e) {
      errors.add(e.message);
    } catch (_) {}

    // 3. Authenticated Open Matches & User's Own Matches (strictly scoped to current player)
    if (session.isAuthenticated &&
        session.isPlayer &&
        session.accessToken != null &&
        session.accessToken!.isNotEmpty) {
      try {
        final openRes = await ApiClient.get('/matches/open');
        if (openRes is List) {
          anySuccess = true;
          nextOpen = openRes
              .whereType<Map<String, dynamic>>()
              .map(_parseChallengeFromApi)
              .toList();
        }
      } on ApiException catch (e) {
        errors.add(e.message);
      } catch (_) {}

      try {
        final mineRes = await ApiClient.get('/matches/mine');
        if (mineRes is List) {
          anySuccess = true;
          nextMine = mineRes
              .whereType<Map<String, dynamic>>()
              .map(_parseChallengeFromApi)
              .toList();
        }
      } on ApiException catch (e) {
        errors.add(e.message);
      } catch (_) {}
    }

    state = state.copyWith(
      blitzPools: nextBlitz,
      tournaments: nextTournaments,
      challenges: nextOpen,
      myMatches: nextMine,
      loading: false,
      syncedWithApi: anySuccess,
      errorMessage: (!anySuccess && errors.isNotEmpty) ? errors.first : null,
    );
  }

  TournamentModel _parseTournamentFromApi(Map<String, dynamic> m) {
    final gp = m['game_profiles'] as Map<String, dynamic>?;
    final rawGameId = (gp?['id'] ?? m['profile_id'] ?? 'eafc').toString();
    final game = findOfficialGameById(rawGameId);
    final entryFee = (m['entry_fee'] as num?)?.toDouble() ?? 10.0;
    final size = (m['size'] as num?)?.toInt() ?? 5;
    final prize =
        (m['prize_pool'] as num?)?.toDouble() ?? (entryFee * size * 0.9);
    final enrolled = (m['enrolled_count'] as num?)?.toInt() ?? 0;
    final tier = (m['tier'] as num?)?.toInt() ?? _tierFromFee(entryFee);
    final name = (m['name'] as String?) ?? '${game.displayName} Cup';
    final isBlitz = size == 5 || name.toLowerCase().contains('blitz');

    final rawParticipants = (m['participants'] ?? m['entrants']) as List?;
    final entrants = rawParticipants == null
        ? const <TournamentEntrant>[]
        : rawParticipants.whereType<Map<String, dynamic>>().map((p) {
            final prof = p['profiles'] as Map<String, dynamic>?;
            return TournamentEntrant(
              username:
                  (prof?['username'] ?? p['username'] ?? '').toString().trim(),
              countryCode:
                  (prof?['country_code'] ?? p['country_code'] ?? 'KE')
                      .toString(),
              checkedIn: p['checked_in'] == true || p['status'] == 'CHECKED_IN',
            );
          }).where((e) => e.username.isNotEmpty).toList();

    return TournamentModel(
      id: (m['id'] ?? '').toString(),
      name: name,
      gameId: game.id,
      format: (m['format'] as String?) ?? 'SINGLE_ELIM',
      size: size,
      entryFeeUsd: entryFee,
      prizePoolUsd: prize,
      status: (m['status'] as String?) ?? 'REGISTRATION',
      isBlitz: isBlitz,
      tier: tier,
      region: (m['region'] as String?) ?? 'Global',
      apiEnrolledCount: enrolled,
      entrants: entrants,
    );
  }

  ChallengeModel _parseChallengeFromApi(Map<String, dynamic> m) {
    final gp = m['game_profiles'] as Map<String, dynamic>?;
    final rawGameId = (gp?['id'] ?? m['profile_id'] ?? 'eafc').toString();
    final game = findOfficialGameById(rawGameId);
    final fee = (m['entry_fee'] as num?)?.toDouble() ?? 0.0;
    final id = (m['id'] ?? '').toString();
    final modeRaw = (m['mode'] as String?)?.toUpperCase() ?? '1V1';

    return ChallengeModel(
      id: id,
      roomCode: (m['room_code'] as String?) ??
          'PVZ-${id.substring(0, id.length >= 4 ? 4 : id.length).toUpperCase()}',
      gameId: game.id,
      hostId: (m['player_a'] ?? m['creator_id'] ?? '').toString(),
      hostName: (m['creator_username'] as String?) ?? 'Host',
      hostElo: (m['creator_elo'] as num?)?.toInt() ?? 1200,
      mode: modeRaw == 'PARTY' ? 'PARTY_SQUAD' : '1V1_OPEN',
      squadSize: modeRaw == 'PARTY' ? '2v2' : '1v1',
      format: (m['format'] as String?) ?? 'BO1',
      stakeUsd: fee,
      isCash: fee > 0,
      region: (m['country_code'] as String?) ?? 'Global',
      countryLock: m['country_code'] as String?,
      status: (m['status'] as String?) ?? 'OPEN',
    );
  }

  int _tierFromFee(double fee) {
    if (fee <= 15) return 1;
    if (fee <= 60) return 2;
    if (fee <= 120) return 3;
    if (fee <= 250) return 4;
    return 5;
  }

  Future<ChallengeModel> createChallenge({
    required String gameId,
    required String hostName,
    required String mode,
    required String squadSize,
    required String format,
    required double stakeUsd,
    required bool isCash,
    required String region,
    String? countryLock,
    String? invitedOpponent,
  }) async {
    final session = _ref.read(playerSessionProvider);
    final game = findOfficialGameById(gameId);
    String id =
        'm_${DateTime.now().millisecondsSinceEpoch.toString().substring(6)}';
    String roomCode =
        'PVZ${DateTime.now().millisecondsSinceEpoch.toString().substring(9)}';

    if (session.accessToken != null && session.accessToken!.isNotEmpty) {
      final res = await ApiClient.post('/matches', data: {
        'profileId': game.uuid,
        'opponentId':
            (invitedOpponent != null && invitedOpponent.trim().isNotEmpty)
                ? invitedOpponent.trim()
                : null,
        'format': format,
        'entryFee': isCash ? stakeUsd : 0,
      });
      if (res is Map && res['id'] != null) {
        id = res['id'].toString();
        if (res['room_code'] != null) {
          roomCode = res['room_code'].toString();
        }
      }
    }

    final created = ChallengeModel(
      id: id,
      roomCode: roomCode,
      gameId: gameId,
      hostId: session.userId,
      hostName: hostName,
      hostElo: session.elo,
      mode: mode,
      squadSize: squadSize,
      format: format,
      stakeUsd: stakeUsd,
      isCash: isCash,
      region: region,
      countryLock: countryLock,
      invitedOpponent: invitedOpponent,
      status: 'OPEN',
    );

    state = state.copyWith(
      challenges: [created, ...state.challenges],
      myMatches: [created, ...state.myMatches],
      clearError: true,
    );
    return created;
  }

  Future<ChallengeModel?> acceptChallenge(
    String idOrCode,
    String username,
  ) async {
    final session = _ref.read(playerSessionProvider);
    final lower = idOrCode.toLowerCase().trim();
    final idx = state.challenges.indexWhere(
      (c) =>
          c.id.toLowerCase() == lower ||
          c.roomCode.toLowerCase() == lower ||
          c.roomCode.replaceAll('-', '').toLowerCase() ==
              lower.replaceAll('-', ''),
    );

    if (session.accessToken != null && session.accessToken!.isNotEmpty) {
      if (idx >= 0) {
        await ApiClient.post('/matches/${state.challenges[idx].id}/accept');
      } else {
        final joined =
            await ApiClient.post('/matches/room/${idOrCode.toUpperCase()}/join');
        if (joined is Map<String, dynamic>) {
          final parsed = _parseChallengeFromApi(joined);
          state = state.copyWith(myMatches: [parsed, ...state.myMatches]);
          return parsed;
        }
      }
    }

    if (idx >= 0) {
      final updated = state.challenges[idx].copyWith(
        opponentName: username,
        status: 'ACCEPTED',
      );
      final next = [...state.challenges];
      next[idx] = updated;
      state = state.copyWith(
        challenges: next,
        myMatches: [updated, ...state.myMatches],
      );
      return updated;
    }
    return null;
  }

  ChallengeModel? findChallengeByIdOrCode(String idOrCode) {
    final lower = idOrCode.toLowerCase().trim();
    for (final c in [...state.myMatches, ...state.challenges]) {
      if (c.id.toLowerCase() == lower ||
          c.roomCode.toLowerCase() == lower ||
          c.roomCode.replaceAll('-', '').toLowerCase() ==
              lower.replaceAll('-', '')) {
        return c;
      }
    }
    return null;
  }

  TournamentModel? findTournamentById(String id) {
    for (final t in [...state.blitzPools, ...state.tournaments]) {
      if (t.id == id) return t;
    }
    return null;
  }

  Future<TournamentModel> createTournament({
    required String name,
    required String gameId,
    required String format,
    required int size,
    required double entryFeeUsd,
    required String region,
    required String creatorUsername,
  }) async {
    final session = _ref.read(playerSessionProvider);
    final game = findOfficialGameById(gameId);
    String id =
        'cup_${DateTime.now().millisecondsSinceEpoch.toString().substring(6)}';

    if (session.accessToken != null && session.accessToken!.isNotEmpty) {
      final res = await ApiClient.post('/tournaments', data: {
        'name': name,
        'profileId': game.uuid,
        'format': format,
        'size': size,
        'entryFee': entryFeeUsd,
      });
      if (res is Map && res['id'] != null) {
        id = res['id'].toString();
      }
    }

    final cup = TournamentModel(
      id: id,
      name: name,
      gameId: gameId,
      format: format,
      size: size,
      entryFeeUsd: entryFeeUsd,
      prizePoolUsd: entryFeeUsd > 0 ? entryFeeUsd * size * 0.90 : 0,
      status: 'REGISTRATION',
      isBlitz: false,
      region: region,
      entrants: [
        TournamentEntrant(
          username: creatorUsername,
          countryCode: session.countryCode,
          checkedIn: true,
        ),
      ],
    );

    state = state.copyWith(tournaments: [cup, ...state.tournaments]);
    return cup;
  }

  Future<TournamentModel?> joinTournament(
    String tournamentId,
    String username,
    String countryCode,
  ) async {
    final session = _ref.read(playerSessionProvider);
    if (session.accessToken != null && session.accessToken!.isNotEmpty) {
      await ApiClient.post('/tournaments/$tournamentId/join');
    }

    TournamentModel? updateList(
      List<TournamentModel> list,
      void Function(List<TournamentModel>) commit, {
      required bool isBlitz,
    }) {
      final idx = list.indexWhere((t) => t.id == tournamentId);
      if (idx < 0) return null;
      final t = list[idx];
      if (t.entrants.any((e) => e.username == username) || t.isFull) {
        return t;
      }
      final nextEntrants = [
        ...t.entrants,
        TournamentEntrant(
          username: username,
          countryCode: countryCode,
          checkedIn: true,
        ),
      ];
      final nextCount = t.enrolledCount + 1;
      final nowFull = nextCount >= t.size;
      final updated = t.copyWith(
        entrants: nextEntrants,
        apiEnrolledCount: nextCount,
        status: nowFull ? 'ACTIVE' : t.status,
      );
      final nextList = [...list];
      nextList[idx] = updated;
      commit(nextList);
      return updated;
    }

    final fromBlitz = updateList(
      state.blitzPools,
      (next) => state = state.copyWith(blitzPools: next),
      isBlitz: true,
    );
    if (fromBlitz != null) return fromBlitz;

    return updateList(
      state.tournaments,
      (next) => state = state.copyWith(tournaments: next),
      isBlitz: false,
    );
  }

  Future<void> checkInTournament(String tournamentId, String username) async {
    final session = _ref.read(playerSessionProvider);
    if (session.accessToken != null && session.accessToken!.isNotEmpty) {
      await ApiClient.post('/tournaments/$tournamentId/checkin');
    }
    void apply(List<TournamentModel> list,
        void Function(List<TournamentModel>) commit) {
      final idx = list.indexWhere((t) => t.id == tournamentId);
      if (idx < 0) return;
      final t = list[idx];
      final nextEntrants = t.entrants
          .map((e) => e.username == username ? e.copyWith(checkedIn: true) : e)
          .toList();
      final nextList = [...list];
      nextList[idx] = t.copyWith(entrants: nextEntrants);
      commit(nextList);
    }

    apply(state.blitzPools, (l) => state = state.copyWith(blitzPools: l));
    apply(state.tournaments, (l) => state = state.copyWith(tournaments: l));
  }

  Future<void> startTournamentBracket(String tournamentId) async {
    final session = _ref.read(playerSessionProvider);
    if (session.accessToken != null && session.accessToken!.isNotEmpty) {
      await ApiClient.post('/tournaments/$tournamentId/start');
    }
    void apply(List<TournamentModel> list,
        void Function(List<TournamentModel>) commit) {
      final idx = list.indexWhere((t) => t.id == tournamentId);
      if (idx < 0) return;
      final nextList = [...list];
      nextList[idx] = list[idx].copyWith(status: 'ACTIVE');
      commit(nextList);
    }

    apply(state.blitzPools, (l) => state = state.copyWith(blitzPools: l));
    apply(state.tournaments, (l) => state = state.copyWith(tournaments: l));
  }
}

final arenaDataProvider =
    StateNotifierProvider<ArenaDataNotifier, ArenaDataState>((ref) {
  return ArenaDataNotifier(ref);
});
