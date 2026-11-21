import 'dart:async';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../catalog/official_games.dart';
import '../network/api_client.dart';
import '../storage/app_state.dart';
import '../../platform_channels/device_bridge.dart';

enum LiveMatchPhase {
  idle,
  waitingReady,
  countdownAutoLaunch,
  liveInGame,
  settled,
}

enum MatchLeadStatus { winning, tied, losing }

class LiveMatchEvent {
  final String id;
  final String title;
  final String detail;
  final String scoreLine;
  final int confidencePct;
  final MatchLeadStatus leadStatus;
  final DateTime timestamp;
  final bool pushedToOs;

  const LiveMatchEvent({
    required this.id,
    required this.title,
    required this.detail,
    required this.scoreLine,
    required this.confidencePct,
    required this.leadStatus,
    required this.timestamp,
    required this.pushedToOs,
  });
}

class LiveMatchState {
  final String? matchId;
  final String roomCode;
  final OfficialGame? game;
  final String hostName;
  final String opponentName;
  final double stakeUsd;
  final bool opponentSeated;
  final bool hostReady;
  final bool opponentReady;
  final String? lastReadyPressedBy;
  final LiveMatchPhase phase;
  final int countdownSeconds;
  final bool autoLaunched;
  final String autoLaunchChannel;
  final bool backgroundActive;
  final int scoreA;
  final int scoreB;
  final int hudConfidence;
  final List<LiveMatchEvent> events;
  final List<LiveMatchEvent> notificationHistory;

  const LiveMatchState({
    this.matchId,
    this.roomCode = '',
    this.game,
    this.hostName = '',
    this.opponentName = '',
    this.stakeUsd = 0.0,
    this.opponentSeated = false,
    this.hostReady = false,
    this.opponentReady = false,
    this.lastReadyPressedBy,
    this.phase = LiveMatchPhase.idle,
    this.countdownSeconds = 0,
    this.autoLaunched = false,
    this.autoLaunchChannel = '',
    this.backgroundActive = false,
    this.scoreA = 0,
    this.scoreB = 0,
    this.hudConfidence = 0,
    this.events = const [],
    this.notificationHistory = const [],
  });

  bool get bothSidesReady => hostReady && opponentReady;

  bool get escrowLocked =>
      bothSidesReady ||
      phase == LiveMatchPhase.countdownAutoLaunch ||
      phase == LiveMatchPhase.liveInGame ||
      phase == LiveMatchPhase.settled;

  MatchLeadStatus get leadStatus {
    if (scoreA > scoreB) return MatchLeadStatus.winning;
    if (scoreA < scoreB) return MatchLeadStatus.losing;
    return MatchLeadStatus.tied;
  }

  String get leadBadgeLabel {
    if (phase == LiveMatchPhase.settled) {
      return scoreA >= scoreB
          ? 'VICTORY · $scoreA - $scoreB'
          : 'DEFEAT · $scoreA - $scoreB';
    }
    switch (leadStatus) {
      case MatchLeadStatus.winning:
        return 'WINNING · $scoreA - $scoreB (+${scoreA - scoreB})';
      case MatchLeadStatus.losing:
        return 'LOSING · $scoreA - $scoreB (-${scoreB - scoreA})';
      case MatchLeadStatus.tied:
        return 'TIED · $scoreA - $scoreB';
    }
  }

  LiveMatchState copyWith({
    String? matchId,
    String? roomCode,
    OfficialGame? game,
    String? hostName,
    String? opponentName,
    double? stakeUsd,
    bool? opponentSeated,
    bool? hostReady,
    bool? opponentReady,
    String? lastReadyPressedBy,
    LiveMatchPhase? phase,
    int? countdownSeconds,
    bool? autoLaunched,
    String? autoLaunchChannel,
    bool? backgroundActive,
    int? scoreA,
    int? scoreB,
    int? hudConfidence,
    List<LiveMatchEvent>? events,
    List<LiveMatchEvent>? notificationHistory,
  }) {
    return LiveMatchState(
      matchId: matchId ?? this.matchId,
      roomCode: roomCode ?? this.roomCode,
      game: game ?? this.game,
      hostName: hostName ?? this.hostName,
      opponentName: opponentName ?? this.opponentName,
      stakeUsd: stakeUsd ?? this.stakeUsd,
      opponentSeated: opponentSeated ?? this.opponentSeated,
      hostReady: hostReady ?? this.hostReady,
      opponentReady: opponentReady ?? this.opponentReady,
      lastReadyPressedBy: lastReadyPressedBy ?? this.lastReadyPressedBy,
      phase: phase ?? this.phase,
      countdownSeconds: countdownSeconds ?? this.countdownSeconds,
      autoLaunched: autoLaunched ?? this.autoLaunched,
      autoLaunchChannel: autoLaunchChannel ?? this.autoLaunchChannel,
      backgroundActive: backgroundActive ?? this.backgroundActive,
      scoreA: scoreA ?? this.scoreA,
      scoreB: scoreB ?? this.scoreB,
      hudConfidence: hudConfidence ?? this.hudConfidence,
      events: events ?? this.events,
      notificationHistory: notificationHistory ?? this.notificationHistory,
    );
  }
}

class LiveMatchEngineNotifier extends StateNotifier<LiveMatchState> {
  final Ref _ref;
  Timer? _countdownTimer;

  LiveMatchEngineNotifier(this._ref) : super(const LiveMatchState()) {
    _ref.listen<PlayerSession>(playerSessionProvider, (prev, next) {
      if (prev?.userId != next.userId || !next.isAuthenticated) {
        _countdownTimer?.cancel();
        DeviceBridge.stopNativeCapture();
        state = const LiveMatchState();
      }
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  /// Attaches a matchroom to the background engine without wiping an already live match.
  void attachMatch({
    required String matchId,
    required String roomCode,
    required OfficialGame game,
    required String hostName,
    required String opponentName,
    double stakeUsd = 0.0,
    bool opponentSeated = false,
    bool hostReady = false,
    bool opponentReady = false,
    int scoreA = 0,
    int scoreB = 0,
    LiveMatchPhase? initialPhase,
  }) {
    if (state.matchId == matchId &&
        (state.phase == LiveMatchPhase.countdownAutoLaunch ||
            state.phase == LiveMatchPhase.liveInGame ||
            state.phase == LiveMatchPhase.settled)) {
      return;
    }
    _countdownTimer?.cancel();
    state = state.copyWith(
      matchId: matchId,
      roomCode: roomCode,
      game: game,
      hostName: hostName,
      opponentName: opponentName,
      stakeUsd: stakeUsd,
      opponentSeated: opponentSeated,
      hostReady: hostReady,
      opponentReady: opponentReady,
      phase: initialPhase ?? LiveMatchPhase.waitingReady,
      countdownSeconds: 0,
      autoLaunched: false,
      autoLaunchChannel: '',
      backgroundActive: false,
      scoreA: scoreA,
      scoreB: scoreB,
      hudConfidence: 0,
      events: const [],
    );
  }

  void setOpponentSeated(bool seated, {String? opponentName}) {
    state = state.copyWith(
      opponentSeated: seated,
      opponentName: opponentName ?? state.opponentName,
      opponentReady: seated ? state.opponentReady : false,
    );
  }

  /// Marks either Creator (Side A) or Joiner (Side B) as Ready.
  /// THE LAST BUTTON PRESSED (whichever side completes Both Ready)
  /// automatically locks escrow, starts background HUD verification,
  /// and FORCE AUTO-LAUNCHES the featured game on both sides!
  Future<void> pressReady({
    required bool isCreatorSide,
  }) async {
    final game = state.game;
    if (game == null) return;

    HapticFeedback.mediumImpact();
    final machine = _ref.read(machineAuthProvider);
    if (!machine.isFullyReady) {
      await _ref.read(machineAuthProvider.notifier).authorizeAllOnce();
    }

    final nextHostReady = isCreatorSide ? !state.hostReady : state.hostReady;
    final nextOppReady =
        !isCreatorSide ? !state.opponentReady : state.opponentReady;

    // Sync Ready status directly to NestJS `/matches/:id/ready` when authenticated
    final session = _ref.read(playerSessionProvider);
    if (session.accessToken != null &&
        session.accessToken!.isNotEmpty &&
        state.matchId != null) {
      try {
        await ApiClient.post('/matches/${state.matchId}/ready', data: {
          'ready': isCreatorSide ? nextHostReady : nextOppReady,
        });
      } catch (_) {}
    }

    // If un-readying before launch
    if (!nextHostReady || !nextOppReady) {
      _countdownTimer?.cancel();
      state = state.copyWith(
        hostReady: nextHostReady,
        opponentReady: nextOppReady,
        phase: LiveMatchPhase.waitingReady,
        countdownSeconds: 0,
        lastReadyPressedBy:
            isCreatorSide ? 'Creator (Side A)' : 'Joiner (Side B)',
      );

      final waitingFor = !nextHostReady
          ? 'Creator (@${state.hostName})'
          : 'Joiner (@${state.opponentName})';
      _ref.read(toastProvider.notifier).show(
            isCreatorSide
                ? (nextHostReady
                    ? 'Creator Ready · Waiting on Opponent'
                    : 'Creator Unreadied')
                : (nextOppReady
                    ? 'Joiner Ready · Waiting on Creator'
                    : 'Joiner Unreadied'),
            body:
                'When $waitingFor presses Ready, ${game.displayName} will force auto-launch automatically.',
            tone: ToastTone.info,
          );
      return;
    }

    // BOTH SIDES READY! Last button pressed triggers synchronized auto-launch!
    final triggeredBy =
        isCreatorSide ? 'Creator (@${state.hostName})' : 'Joiner (@${state.opponentName})';

    state = state.copyWith(
      hostReady: true,
      opponentReady: true,
      lastReadyPressedBy: triggeredBy,
      phase: LiveMatchPhase.countdownAutoLaunch,
      countdownSeconds: 3,
      backgroundActive: true,
    );

    await DeviceBridge.startNativeCapture(
      matchId: state.matchId ?? 'live_match',
      gameId: game.id,
      gameTitle: game.displayName,
      roomCode: state.roomCode,
    );

    await _pushLiveEvent(
      title: 'BOTH SIDES READY · FORCE AUTO-LAUNCHING',
      detail:
          'Final Ready by $triggeredBy. Smart Escrow locked — launching ${game.displayName} in 3s.',
      scoreA: 0,
      scoreB: 0,
      confidencePct: 99,
      toastTone: ToastTone.success,
    );

    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final nextSec = state.countdownSeconds - 1;
      if (nextSec > 0) {
        state = state.copyWith(countdownSeconds: nextSec);
      } else {
        timer.cancel();
        await executeForceAutoLaunch();
      }
    });
  }

  /// Executes the OS-level force auto-launch of the installed featured game
  /// and transitions Playverzus into Background Live Verification + Notification mode.
  Future<void> executeForceAutoLaunch() async {
    _countdownTimer?.cancel();
    final game = state.game;
    if (game == null) return;

    final res = await DeviceBridge.forceAutoLaunchGame(
      game,
      matchId: state.matchId ?? 'live_match',
    );

    state = state.copyWith(
      phase: LiveMatchPhase.liveInGame,
      countdownSeconds: 0,
      autoLaunched: true,
      autoLaunchChannel: res.channelLabel,
      backgroundActive: true,
    );

    await _pushLiveEvent(
      title: 'KICKOFF · ${game.shortName} AUTO-LAUNCHED',
      detail:
          '${res.channelLabel}. Playverzus is running in background — live winning/losing alerts active.',
      scoreA: state.scoreA,
      scoreB: state.scoreB,
      confidencePct: 98,
      toastTone: ToastTone.matchEvent,
    );
  }

  /// Pushes a live verified score/point update (called by real HUD verifier or live simulator).
  Future<void> recordVerifiedPoint({
    required int scoreA,
    required int scoreB,
    required String eventTag,
    String? customDetail,
    int confidencePct = 98,
    bool isFinal = false,
  }) async {
    final game = state.game;
    if (game == null) return;

    final lead = scoreA > scoreB
        ? MatchLeadStatus.winning
        : scoreA < scoreB
            ? MatchLeadStatus.losing
            : MatchLeadStatus.tied;

    final statusHeadline = isFinal
        ? (scoreA >= scoreB
            ? 'FULL TIME · VICTORY VERIFIED ($scoreA - $scoreB)'
            : 'FULL TIME · MATCH SETTLED ($scoreA - $scoreB)')
        : switch (lead) {
            MatchLeadStatus.winning =>
              '$eventTag · YOU ARE WINNING ($scoreA - $scoreB)',
            MatchLeadStatus.losing =>
              '$eventTag · YOU ARE LOSING ($scoreA - $scoreB)',
            MatchLeadStatus.tied =>
              '$eventTag · MATCH TIED ($scoreA - $scoreB)',
          };

    final computedDetail = customDetail ??
        (isFinal
            ? 'Final scoreboard verified ($confidencePct% HUD confidence). Smart Escrow payout released!'
            : switch (lead) {
                MatchLeadStatus.winning =>
                  'Leading by +${scoreA - scoreB} in ${game.shortName}. Hold lead to secure payout · HUD $confidencePct%.',
                MatchLeadStatus.losing =>
                  'Trailing by ${scoreB - scoreA} in ${game.shortName}. Score ${scoreB - scoreA} to equalize · HUD $confidencePct%.',
                MatchLeadStatus.tied =>
                  'All square in ${game.shortName}. Next verified point takes the lead · HUD $confidencePct%.',
              });

    state = state.copyWith(
      scoreA: scoreA,
      scoreB: scoreB,
      hudConfidence: confidencePct,
      phase: isFinal ? LiveMatchPhase.settled : LiveMatchPhase.liveInGame,
      backgroundActive: !isFinal,
    );

    if (isFinal) {
      await DeviceBridge.stopNativeCapture();
    }

    await _pushLiveEvent(
      title: statusHeadline,
      detail: computedDetail,
      scoreA: scoreA,
      scoreB: scoreB,
      confidencePct: confidencePct,
      toastTone: isFinal
          ? ToastTone.success
          : lead == MatchLeadStatus.losing
              ? ToastTone.warning
              : ToastTone.matchEvent,
    );
  }

  void clearBackgroundBar() {
    _countdownTimer?.cancel();
    DeviceBridge.stopNativeCapture();
    state = state.copyWith(backgroundActive: false);
  }

  Future<void> _pushLiveEvent({
    required String title,
    required String detail,
    required int scoreA,
    required int scoreB,
    required int confidencePct,
    required ToastTone toastTone,
  }) async {
    final pushedOs = await DeviceBridge.sendLiveMatchNotification(
      title: title,
      body: detail,
    );

    final lead = scoreA > scoreB
        ? MatchLeadStatus.winning
        : scoreA < scoreB
            ? MatchLeadStatus.losing
            : MatchLeadStatus.tied;

    final evt = LiveMatchEvent(
      id: '${DateTime.now().microsecondsSinceEpoch}',
      title: title,
      detail: detail,
      scoreLine: '$scoreA - $scoreB',
      confidencePct: confidencePct,
      leadStatus: lead,
      timestamp: DateTime.now(),
      pushedToOs: pushedOs,
    );

    state = state.copyWith(
      events: [evt, ...state.events].take(12).toList(),
      notificationHistory: [evt, ...state.notificationHistory].take(20).toList(),
    );

    _ref.read(toastProvider.notifier).show(
          title,
          body: detail,
          tone: toastTone,
        );
  }
}

final liveMatchEngineProvider =
    StateNotifierProvider<LiveMatchEngineNotifier, LiveMatchState>((ref) {
  return LiveMatchEngineNotifier(ref);
});
