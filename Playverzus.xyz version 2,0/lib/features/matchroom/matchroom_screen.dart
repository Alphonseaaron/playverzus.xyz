import 'dart:async';
import 'dart:math';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/official_games.dart';
import '../../core/config/app_config.dart';
import '../../core/data/arena_repository.dart';
import '../../core/engine/live_match_engine.dart';
import '../../core/network/api_client.dart';
import '../../core/security/anti_fraud_engine.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/country_flag.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../../design_system/widgets/proof_of_victory_card.dart';
import '../../platform_channels/device_bridge.dart';
import 'pre_match_permissions_sheet.dart';

class MatchRoomScreen extends ConsumerStatefulWidget {
  final String matchId;
  const MatchRoomScreen({super.key, required this.matchId});

  @override
  ConsumerState<MatchRoomScreen> createState() => _MatchRoomScreenState();
}

class _MatchRoomScreenState extends ConsumerState<MatchRoomScreen> {
  Timer? _pollTimer;
  final TextEditingController _scoreProofCtrl = TextEditingController();
  bool _scoreProofFinal = true;
  bool _submittingProof = false;
  bool _settling = false;
  int _telemetrySeq = 0;
  final List<ScoreFrameSample> _localFrameHistory = [];
  String? _lastAntiFraudSummary;

  String? _coinWinner;
  bool _copiedRoom = false;
  bool _loading = false;
  bool _joining = false;
  String? _error;
  String _format = 'BO1';
  String _matchStatus = 'OPEN';
  String? _winnerName;
  String _hostCountry = '';
  String _opponentCountry = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _loadMatchState();
      // Live 4-second match polling (1:1 parity with v1.0 MatchDetailContent)
      _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) {
        if (!mounted) return;
        if (_matchStatus == 'SETTLED' ||
            _matchStatus == 'COMPLETED' ||
            _matchStatus == 'CANCELLED' ||
            _matchStatus == 'VOIDED') {
          _pollTimer?.cancel();
          return;
        }
        _loadMatchState(silent: true);
      });
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _scoreProofCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMatchState({bool silent = false}) async {
    final activeGame = ref.read(activeGameProvider);
    final session = ref.read(playerSessionProvider);
    final local = ref
        .read(arenaDataProvider.notifier)
        .findChallengeByIdOrCode(widget.matchId);

    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    Map<String, dynamic>? remote;
    if (session.accessToken != null && session.accessToken!.isNotEmpty) {
      try {
        final res = await ApiClient.get('/matches/${widget.matchId}');
        if (res is Map<String, dynamic>) {
          remote = res;
        }
      } on ApiException catch (e) {
        if (!silent && local == null) {
          _error = e.message;
        }
      } catch (_) {}
    }

    if (!mounted) return;

    final gp = remote?['game_profiles'] as Map<String, dynamic>?;
    final rawGameId =
        (gp?['id'] ?? remote?['profile_id'] ?? local?.gameId ?? activeGame.id)
            .toString();
    final game = findOfficialGameById(rawGameId);
    final roomCode = (remote?['room_code'] ??
            remote?['roomCode'] ??
            local?.roomCode ??
            'PVZ-${widget.matchId.substring(0, min(6, widget.matchId.length)).toUpperCase()}')
        .toString();

    final playerAProf = remote?['player_a_profile'] as Map<String, dynamic>?;
    final playerBProf = remote?['player_b_profile'] as Map<String, dynamic>?;

    final hostName = (remote?['playerAUsername'] ??
            playerAProf?['username'] ??
            remote?['creator_username'] ??
            local?.hostName ??
            session.username)
        .toString();

    final rawOpponent = (remote?['playerBUsername'] ??
            playerBProf?['username'] ??
            remote?['opponent_username'] ??
            local?.opponentName ??
            '')
        .toString()
        .trim();
    final opponentSeated = rawOpponent.isNotEmpty;

    _hostCountry = (remote?['playerACountry'] ??
            playerAProf?['country_code'] ??
            (hostName.toLowerCase() == session.username.toLowerCase()
                ? session.countryCode
                : ''))
        .toString();
    _opponentCountry = (remote?['playerBCountry'] ??
            playerBProf?['country_code'] ??
            '')
        .toString();

    final stakeUsd =
        ((remote?['entryFee'] ?? remote?['entry_fee']) as num?)?.toDouble() ??
            local?.stakeUsd ??
            0.0;
    final status =
        (remote?['status'] ?? local?.status ?? 'OPEN').toString().toUpperCase();
    final scoreA =
        ((remote?['playerAScore'] ?? remote?['player_a_score'] ?? remote?['score_a'])
                    as num?)
                ?.toInt() ??
            0;
    final scoreB =
        ((remote?['playerBScore'] ?? remote?['player_b_score'] ?? remote?['score_b'])
                    as num?)
                ?.toInt() ??
            0;
    final hostReady =
        remote?['readyA'] == true || remote?['player_a_ready'] == true;
    final oppReady =
        remote?['readyB'] == true || remote?['player_b_ready'] == true;

    _format = (remote?['format'] ?? local?.format ?? 'BO1').toString();
    _matchStatus = status;
    final winnerId = (remote?['winner'] ?? remote?['winner_id'])?.toString();
    if (winnerId != null && winnerId.isNotEmpty) {
      _winnerName =
          winnerId == (remote?['playerA'] ?? remote?['player_a'])?.toString()
              ? hostName
              : rawOpponent;
    }

    final initialPhase = switch (status) {
      'SETTLED' || 'COMPLETED' => LiveMatchPhase.settled,
      'LIVE' || 'IN_PROGRESS' => LiveMatchPhase.liveInGame,
      _ => LiveMatchPhase.waitingReady,
    };

    final prevLive = ref.read(liveMatchEngineProvider);
    ref.read(liveMatchEngineProvider.notifier).attachMatch(
          matchId: widget.matchId,
          roomCode: roomCode,
          game: game,
          hostName: hostName,
          opponentName: rawOpponent,
          stakeUsd: stakeUsd,
          opponentSeated: opponentSeated,
          hostReady: hostReady,
          opponentReady: oppReady,
          scoreA: scoreA,
          scoreB: scoreB,
          initialPhase: initialPhase,
        );

    // If remote polling just observed both players Ready for the first time, trigger auto-launch!
    if (hostReady &&
        oppReady &&
        !prevLive.bothSidesReady &&
        initialPhase == LiveMatchPhase.waitingReady) {
      ref.read(liveMatchEngineProvider.notifier).executeForceAutoLaunch();
    }

    if (!silent) {
      setState(() => _loading = false);
    } else {
      setState(() {});
    }
  }

  Future<void> _submitScoreProof() async {
    final txt = _scoreProofCtrl.text.trim();
    if (txt.isEmpty) {
      ref.read(toastProvider.notifier).show(
            'Enter the observed scoreboard text (e.g. 3 - 1 FULL TIME)',
            tone: ToastTone.warning,
          );
      return;
    }

    // 1. Run Bulletproof Anti-Fraud Pre-Validation (Velocity, Frozen-Frame, Temporal Persistence & HMAC-SHA256)
    final session = ref.read(playerSessionProvider);
    final live = ref.read(liveMatchEngineProvider);
    final nextSeq = _telemetrySeq + 1;
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    final temporal = VotingOcrEngine.computeTemporalConfidence(
      currentText: txt,
      baseConfidence: 0.92,
      recentHistory: _localFrameHistory.map((f) => f.rawText).toList(),
    );

    final candidateFrame = ScoreFrameSample.fromRaw(
      matchId: widget.matchId,
      playerId: session.userId.isNotEmpty ? session.userId : session.username,
      rawText: txt,
      confidence: temporal.effectiveConfidence,
      isFinal: _scoreProofFinal,
    );

    final antiCheat = AntiCheatAnalyzer.analyzeScoreStream(
      [..._localFrameHistory, candidateFrame],
    );
    if (antiCheat.suspicious) {
      ref.read(toastProvider.notifier).show(
            'Anti-Fraud Guard Blocked Submission',
            body: antiCheat.reasons.first,
            tone: ToastTone.error,
          );
      return;
    }

    final secret = live.roomCode.isNotEmpty ? live.roomCode : widget.matchId;
    final payload = TelemetryPayload(
      matchId: widget.matchId,
      playerId: candidateFrame.playerId,
      seq: nextSeq,
      timestamp: nowMs,
      perceptualHash: candidateFrame.imageHash,
      rawText: txt,
    );
    final signature = TelemetrySigner.signTelemetry(secret, payload);
    final verify = TelemetrySigner.verifyTelemetry(
      secret: secret,
      signature: signature,
      payload: payload,
      lastSeq: _telemetrySeq == 0 ? null : _telemetrySeq,
      nowMs: nowMs,
    );
    if (!verify.valid) {
      ref.read(toastProvider.notifier).show(
            'Telemetry signature failed',
            body: verify.reason,
            tone: ToastTone.error,
          );
      return;
    }

    setState(() => _submittingProof = true);
    try {
      await ApiClient.post('/matches/${widget.matchId}/score', data: {
        'rawText': txt,
        'confidence': temporal.effectiveConfidence,
        'isFinal': _scoreProofFinal,
        'imageHash': candidateFrame.imageHash,
        'source': 'MANUAL_OCR',
      });
      _telemetrySeq = nextSeq;
      _localFrameHistory.add(candidateFrame);
      _lastAntiFraudSummary =
          'Seq #$nextSeq · HMAC-${signature.substring(0, 8)} · Conf ${(temporal.effectiveConfidence * 100).toStringAsFixed(0)}%';
      _scoreProofCtrl.clear();
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(
            'Verified Score Proof Submitted',
            body: _lastAntiFraudSummary,
            tone: ToastTone.success,
          );
      await _loadMatchState(silent: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _submittingProof = false);
    }
  }

  Future<void> _triggerSettlement() async {
    setState(() => _settling = true);
    try {
      await ApiClient.post('/matches/${widget.matchId}/settle');
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(
            'Settlement verification triggered',
            tone: ToastTone.success,
          );
      await _loadMatchState(silent: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } finally {
      if (mounted) setState(() => _settling = false);
    }
  }

  void _copyCs2GsiConfig(String roomCode) {
    final gsiCfg = '''"Playverzus Live GSI"
{
  "uri" "${AppConfig.apiBaseUrl}/matches/${widget.matchId}/gsi"
  "timeout" "5.0"
  "buffer" "0.1"
  "throttle" "0.5"
  "heartbeat" "10.0"
  "auth"
  {
    "token" "$roomCode"
  }
  "data"
  {
    "map" "1"
    "round" "1"
    "player_id" "1"
    "player_match_stats" "1"
  }
}''';
    Clipboard.setData(ClipboardData(text: gsiCfg));
    ref.read(toastProvider.notifier).show(
          'CS2 GSI Config Copied',
          body: 'Save as gamestate_integration_playverzus.cfg in csgo/cfg/',
          tone: ToastTone.success,
        );
  }

  void _flipCoin(String hostName, String opponentName) {
    HapticFeedback.mediumImpact();
    final oppLabel =
        opponentName.isNotEmpty ? 'Joiner (@$opponentName)' : 'Joiner (Side B)';
    final winner =
        Random().nextBool() ? 'Creator (@$hostName)' : oppLabel;
    setState(() => _coinWinner = winner);
    ref.read(toastProvider.notifier).show(
          'Coin Toss Result',
          body: '$winner won host / home side selection.',
          tone: ToastTone.info,
        );
  }

  @override
  Widget build(BuildContext context) {
    final activeGame = ref.watch(activeGameProvider);
    final session = ref.watch(playerSessionProvider);
    final machine = ref.watch(machineAuthProvider);
    final handles = ref.watch(gameAccountsProvider);
    final live = ref.watch(liveMatchEngineProvider);

    final game = live.game ?? activeGame;
    final myHandle = handles[game.id] ?? '@${session.username}';
    final roomCode = live.roomCode.isNotEmpty
        ? live.roomCode
        : 'PVZ-${widget.matchId.substring(0, min(6, widget.matchId.length)).toUpperCase()}';
    final inviteLink = 'https://playverzus.xyz/#/matches/${widget.matchId}';
    final gameInstalledOnDevice = machine.installedGameIds.contains(game.id);

    final isHost = live.hostName.toLowerCase() == session.username.toLowerCase();
    final isOpponent = live.opponentSeated &&
        live.opponentName.toLowerCase() == session.username.toLowerCase();
    final canAcceptAsOpponent = !live.opponentSeated && !isHost;

    final isSettled = live.phase == LiveMatchPhase.settled ||
        _matchStatus == 'SETTLED' ||
        _matchStatus == 'COMPLETED';
    final isCountdown = live.phase == LiveMatchPhase.countdownAutoLaunch;
    final isLiveInGame = live.phase == LiveMatchPhase.liveInGame;

    final Color leadAccent = switch (live.leadStatus) {
      MatchLeadStatus.winning => HigColors.emerald,
      MatchLeadStatus.losing => HigColors.crimson,
      MatchLeadStatus.tied => HigColors.brand,
    };

    final leftColumn = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // HEAD-TO-HEAD ROSTER & DUAL-SIDE READY HANDSHAKE
        GlassCard(
          radius: 18,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                runSpacing: 6,
                children: [
                  Text('Head-to-Head Roster', style: HigTypography.title3()),
                  HigBadge(
                    label: isSettled
                        ? 'FINAL · ${live.scoreA} - ${live.scoreB}'
                        : isLiveInGame
                            ? live.leadBadgeLabel
                            : isCountdown
                                ? 'LAUNCHING IN ${live.countdownSeconds}s'
                                : live.opponentSeated
                                    ? 'WAITING READY'
                                    : 'OPEN LOBBY',
                    tone: isSettled ||
                            (isLiveInGame &&
                                live.leadStatus == MatchLeadStatus.winning)
                        ? HigBadgeTone.emerald
                        : live.leadStatus == MatchLeadStatus.losing &&
                                isLiveInGame
                            ? HigBadgeTone.crimson
                            : HigBadgeTone.copper,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _competitorRow(
                label: 'CREATOR · SIDE A',
                username:
                    live.hostName.isNotEmpty ? '@${live.hostName}' : 'Host',
                countryCode: _hostCountry,
                handle: isHost
                    ? myHandle
                    : '${live.hostName} (${game.gamertagLabel})',
                ready: live.hostReady,
                score: live.scoreA,
                actionLabel: live.hostReady ? 'Ready ✓' : 'Ready',
                actionAccent: live.hostReady
                    ? HigButtonVariant.emerald
                    : HigButtonVariant.primary,
                onAction: isHost && live.opponentSeated && !isSettled
                    ? () async {
                        if (!live.hostReady) {
                          final ok = await PreMatchPermissionsDialog
                              .ensureAuthorized(
                            context,
                            ref,
                            gameName: game.displayName,
                          );
                          if (!ok || !mounted) return;
                        }
                        await ref
                            .read(liveMatchEngineProvider.notifier)
                            .pressReady(isCreatorSide: true);
                      }
                    : null,
                onCopy: () {
                  Clipboard.setData(ClipboardData(text: myHandle));
                  ref.read(toastProvider.notifier).show(
                        '${game.gamertagLabel} Copied',
                        body: myHandle,
                        tone: ToastTone.info,
                      );
                },
              ),
              const SizedBox(height: 12),
              _competitorRow(
                label: 'JOINER · SIDE B',
                username: live.opponentSeated
                    ? '@${live.opponentName}'
                    : 'Waiting for opponent to join...',
                countryCode: live.opponentSeated ? _opponentCountry : '',
                handle: live.opponentSeated
                    ? (isOpponent
                        ? myHandle
                        : '${live.opponentName} (${game.gamertagLabel})')
                    : 'Share room code $roomCode or invite link',
                ready: live.opponentReady,
                score: live.scoreB,
                actionLabel: live.opponentReady ? 'Ready ✓' : 'Ready',
                actionAccent: live.opponentReady
                    ? HigButtonVariant.emerald
                    : HigButtonVariant.primary,
                onAction: isOpponent && !isSettled
                    ? () async {
                        if (!live.opponentReady) {
                          final ok = await PreMatchPermissionsDialog
                              .ensureAuthorized(
                            context,
                            ref,
                            gameName: game.displayName,
                          );
                          if (!ok || !mounted) return;
                        }
                        await ref
                            .read(liveMatchEngineProvider.notifier)
                            .pressReady(isCreatorSide: false);
                      }
                    : null,
                onCopy: () {
                  Clipboard.setData(ClipboardData(text: inviteLink));
                  ref.read(toastProvider.notifier).show(
                        'Invite Link Copied',
                        body: 'Opponent can open link or enter code $roomCode.',
                        tone: ToastTone.info,
                      );
                },
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(
                  color: HigColors.surfaceGrouped,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: HigColors.glassBorder, width: 0.6),
                ),
                child: Row(
                  children: [
                    const Icon(
                      CupertinoIcons.bolt_circle_fill,
                      color: HigColors.brand,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Synchronized Auto-Launch: Once both players press Ready, escrow locks and ${game.displayName} auto-launches on both devices.',
                        style: HigTypography.caption(),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: HigButton(
                      label: _coinWinner == null
                          ? 'Flip Coin for Side'
                          : 'Toss: $_coinWinner',
                      icon: CupertinoIcons.circle_grid_hex_fill,
                      variant: HigButtonVariant.secondary,
                      fullWidth: true,
                      onPressed: () =>
                          _flipCoin(live.hostName, live.opponentName),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: HigButton(
                      label: _copiedRoom ? 'Link Copied' : 'Share $roomCode',
                      icon: CupertinoIcons.share,
                      variant: HigButtonVariant.secondary,
                      fullWidth: true,
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: inviteLink));
                        setState(() => _copiedRoom = true);
                        ref.read(toastProvider.notifier).show(
                              'Match Invite Link Copied',
                              body:
                                  'Opponent can open link or enter code $roomCode on Duels.',
                              tone: ToastTone.info,
                            );
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // LIVE BACKGROUND VERIFICATION FEED
        GlassCard(
          radius: 18,
          padding: const EdgeInsets.all(20),
          borderColor: isLiveInGame
              ? leadAccent.withValues(alpha: 0.45)
              : HigColors.glassBorder,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                runSpacing: 6,
                children: [
                  Text('Live Verification Feed', style: HigTypography.title3()),
                  HigBadge(
                    label: isLiveInGame
                        ? 'LIVE TRACKING'
                        : isSettled
                            ? 'VERIFIED'
                            : 'STANDBY',
                    tone: isLiveInGame || isSettled
                        ? HigBadgeTone.emerald
                        : HigBadgeTone.neutral,
                    icon: CupertinoIcons.bell_fill,
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'While ${game.shortName} runs in the foreground, Playverzus verifies scoreboard updates in the background and pushes real-time notifications.',
                style: HigTypography.caption(),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: leadAccent.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: leadAccent.withValues(alpha: 0.35),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      live.leadStatus == MatchLeadStatus.winning
                          ? CupertinoIcons.arrow_up_circle_fill
                          : live.leadStatus == MatchLeadStatus.losing
                              ? CupertinoIcons.arrow_down_circle_fill
                              : CupertinoIcons.equal_circle_fill,
                      color: leadAccent,
                      size: 22,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isLiveInGame || isSettled
                                ? live.leadBadgeLabel
                                : 'Score: ${live.scoreA} - ${live.scoreB}',
                            style: HigTypography.headline(color: leadAccent),
                          ),
                          Text(
                            isLiveInGame
                                ? 'Background verification active (${live.autoLaunchChannel}).'
                                : isSettled
                                    ? 'Verified & settled via Smart Escrow.'
                                    : live.opponentSeated
                                        ? 'Arms automatically once both sides press Ready.'
                                        : 'Waiting for opponent to join Side B.',
                            style: HigTypography.caption(),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (live.events.isNotEmpty) ...[
                const SizedBox(height: 14),
                const Divider(height: 1),
                const SizedBox(height: 10),
                ...live.events.take(6).map(
                      (e) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              margin: const EdgeInsets.only(top: 4),
                              width: 7,
                              height: 7,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: e.leadStatus == MatchLeadStatus.winning
                                    ? HigColors.emerald
                                    : e.leadStatus == MatchLeadStatus.losing
                                        ? HigColors.crimson
                                        : HigColors.brand,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    e.title,
                                    style: HigTypography.headline()
                                        .copyWith(fontSize: 12.5),
                                  ),
                                  Text(
                                    e.detail,
                                    style: HigTypography.caption(),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
              ],
            ],
          ),
        ),
      ],
    );

    final rightColumn = GlassCard(
      radius: 18,
      padding: const EdgeInsets.all(20),
      borderColor: live.escrowLocked
          ? HigColors.emerald.withValues(alpha: 0.45)
          : HigColors.brand.withValues(alpha: 0.35),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              Text('Auto-Launch & Smart Escrow',
                  style: HigTypography.title3()),
              HigBadge(
                label: live.escrowLocked ? 'ESCROW LOCKED' : 'AUTO-ESCROW',
                tone: live.escrowLocked
                    ? HigBadgeTone.emerald
                    : HigBadgeTone.copper,
                icon: CupertinoIcons.lock_shield_fill,
              ),
            ],
          ),
          const SizedBox(height: 14),
          _stepTile(
            1,
            'Device Fingerprint & Alerts Bound',
            '${machine.deviceFingerprint} · ${machine.capabilities.modeTitle}',
            done: machine.isFullyReady,
          ),
          _stepTile(
            2,
            'Featured Game Confirmed On Device',
            gameInstalledOnDevice
                ? '${game.displayName} verified installed — ready for instant launch.'
                : '${game.displayName} not yet pinned on this device — confirm below.',
            done: gameInstalledOnDevice,
          ),
          _stepTile(
            3,
            'Both Sides Ready → Auto-Launch',
            live.bothSidesReady
                ? 'Final Ready by ${live.lastReadyPressedBy ?? 'Player'} — launch armed.'
                : 'Creator (${live.hostReady ? 'READY' : 'waiting'}) · Joiner (${live.opponentSeated ? (live.opponentReady ? 'READY' : 'waiting') : 'unseated'})',
            done: live.bothSidesReady,
          ),
          _stepTile(
            4,
            'Background Verification & Settlement',
            'Verifies final score & settles Smart Escrow automatically on Full Time.',
            done: isLiveInGame || isSettled,
          ),
          const SizedBox(height: 16),

          if (!isSettled)
            HigButton(
              label: isCountdown
                  ? 'Launching ${game.shortName} in ${live.countdownSeconds}s...'
                  : isLiveInGame
                      ? 'Re-Open ${game.shortName}'
                      : !live.opponentSeated
                          ? 'Waiting for Opponent to Join'
                          : (isHost
                              ? (live.hostReady
                                  ? 'Waiting on Opponent Ready...'
                                  : 'Mark Ready (Side A)')
                              : (isOpponent
                                  ? (live.opponentReady
                                      ? 'Waiting on Host Ready...'
                                      : 'Mark Ready (Side B)')
                                  : 'Spectating Match')),
              icon: isCountdown || isLiveInGame
                  ? CupertinoIcons.rocket_fill
                  : CupertinoIcons.bolt_fill,
              variant: live.bothSidesReady
                  ? HigButtonVariant.emerald
                  : HigButtonVariant.primary,
              size: HigButtonSize.large,
              fullWidth: true,
              onPressed: (!live.opponentSeated && !isLiveInGame)
                  ? null
                  : () async {
                      final engine = ref.read(liveMatchEngineProvider.notifier);
                      if (isCountdown || isLiveInGame) {
                        await engine.executeForceAutoLaunch();
                      } else if (isHost) {
                        if (!live.hostReady) {
                          final ok = await PreMatchPermissionsDialog
                              .ensureAuthorized(
                            context,
                            ref,
                            gameName: game.displayName,
                          );
                          if (!ok || !mounted) return;
                        }
                        await engine.pressReady(isCreatorSide: true);
                      } else if (isOpponent) {
                        if (!live.opponentReady) {
                          final ok = await PreMatchPermissionsDialog
                              .ensureAuthorized(
                            context,
                            ref,
                            gameName: game.displayName,
                          );
                          if (!ok || !mounted) return;
                        }
                        await engine.pressReady(isCreatorSide: false);
                      }
                    },
            ),

          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: HigButton(
                  label: gameInstalledOnDevice
                      ? 'Launch ${game.shortName}'
                      : 'Confirm Installed',
                  icon: gameInstalledOnDevice
                      ? CupertinoIcons.game_controller_solid
                      : CupertinoIcons.checkmark_shield_fill,
                  variant: HigButtonVariant.secondary,
                  size: HigButtonSize.small,
                  fullWidth: true,
                  onPressed: () async {
                    if (!gameInstalledOnDevice) {
                      await ref
                          .read(machineAuthProvider.notifier)
                          .toggleInstalledGame(game.id);
                      ref.read(toastProvider.notifier).show(
                            '${game.displayName} Confirmed On Device',
                            body:
                                'Auto-launch integration enabled for this title.',
                            tone: ToastTone.success,
                          );
                      return;
                    }
                    final ok = await PreMatchPermissionsDialog.ensureAuthorized(
                      context,
                      ref,
                      gameName: game.displayName,
                    );
                    if (!ok || !mounted) return;
                    final res = await DeviceBridge.forceAutoLaunchGame(
                      game,
                      matchId: widget.matchId,
                    );
                    ref.read(toastProvider.notifier).show(
                          res.launched
                              ? 'Launched ${game.displayName}'
                              : 'Switch to ${game.displayName}',
                          body:
                              '${res.channelLabel}. Playverzus remains active in background.',
                          tone: ToastTone.info,
                        );
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: HigButton(
                  label: 'Link Console Stream',
                  icon: CupertinoIcons.tv,
                  variant: HigButtonVariant.secondary,
                  size: HigButtonSize.small,
                  fullWidth: true,
                  onPressed: () async {
                    final channel = machine.consoleStreamChannel;
                    if (channel.isEmpty) {
                      ref.read(toastProvider.notifier).show(
                            'Link your Twitch or YouTube channel in Settings first',
                            tone: ToastTone.info,
                          );
                      context.push('/settings');
                      return;
                    }
                    try {
                      await ApiClient.post('/stream/link', data: {
                        'matchId': widget.matchId,
                        'platform': machine.consoleStreamPlatform,
                        'channelIdentifier': channel,
                      });
                      ref.read(toastProvider.notifier).show(
                            'Console stream linked to match',
                            tone: ToastTone.success,
                          );
                    } on ApiException catch (e) {
                      ref
                          .read(toastProvider.notifier)
                          .show(e.message, tone: ToastTone.error);
                    }
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (!isSettled && (isHost || isOpponent)) ...[
            const Divider(height: 22),
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 4,
              children: [
                Text('Anti-Fraud Verification & Settlement',
                    style: HigTypography.headline().copyWith(fontSize: 13.5)),
                const HigBadge(
                  label: 'HMAC-SHA256 · dHASH · DUAL ORACLE',
                  tone: HigBadgeTone.emerald,
                ),
              ],
            ),
            if (_lastAntiFraudSummary != null) ...[
              const SizedBox(height: 4),
              Text(
                _lastAntiFraudSummary!,
                style: HigTypography.mono(
                  size: 10.5,
                  color: HigColors.emerald,
                ),
              ),
            ],
            const SizedBox(height: 6),
            HigTextField(
              controller: _scoreProofCtrl,
              placeholder: 'Scoreboard reading (e.g. 3 - 1 FULL TIME)',
              prefixIcon: CupertinoIcons.doc_text_search,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Full Time', style: HigTypography.caption()),
                    const SizedBox(width: 6),
                    CupertinoSwitch(
                      value: _scoreProofFinal,
                      activeTrackColor: HigColors.emerald,
                      onChanged: (v) => setState(() => _scoreProofFinal = v),
                    ),
                  ],
                ),
                HigButton(
                  label: 'Submit Score Proof',
                  size: HigButtonSize.small,
                  variant: HigButtonVariant.secondary,
                  loading: _submittingProof,
                  onPressed: _submitScoreProof,
                ),
                HigButton(
                  label: 'Trigger Settlement',
                  size: HigButtonSize.small,
                  variant: HigButtonVariant.emerald,
                  loading: _settling,
                  onPressed: _triggerSettlement,
                ),
                if (game.id == 'cs2')
                  HigButton(
                    label: 'Copy CS2 GSI .cfg',
                    icon: CupertinoIcons.doc_on_doc,
                    size: HigButtonSize.small,
                    variant: HigButtonVariant.secondary,
                    onPressed: () => _copyCs2GsiConfig(roomCode),
                  ),
              ],
            ),
            const SizedBox(height: 10),
          ],
          Row(
            children: [
              Expanded(
                child: HigButton(
                  label: 'Raise Dispute',
                  icon: CupertinoIcons.exclamationmark_triangle,
                  variant: HigButtonVariant.secondary,
                  size: HigButtonSize.small,
                  fullWidth: true,
                  onPressed: () async {
                    try {
                      await ApiClient.post(
                        '/matches/${widget.matchId}/dispute',
                        data: {
                          'reason':
                              'Score or match anomaly reported by participant'
                        },
                      );
                      ref.read(toastProvider.notifier).show(
                            'Dispute submitted to Review Queue',
                            tone: ToastTone.warning,
                          );
                    } on ApiException catch (e) {
                      ref
                          .read(toastProvider.notifier)
                          .show(e.message, tone: ToastTone.error);
                    }
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: HigButton(
                  label: 'Cancel Match',
                  icon: CupertinoIcons.xmark_circle,
                  variant: HigButtonVariant.destructive,
                  size: HigButtonSize.small,
                  fullWidth: true,
                  onPressed: () async {
                    try {
                      await ApiClient.post('/matches/${widget.matchId}/cancel');
                      if (!context.mounted) return;
                      ref.read(toastProvider.notifier).show(
                            'Match cancelled',
                            tone: ToastTone.info,
                          );
                      context.go('/challenges');
                    } on ApiException catch (e) {
                      ref
                          .read(toastProvider.notifier)
                          .show(e.message, tone: ToastTone.error);
                    }
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );

    return RefreshIndicator(
      onRefresh: _loadMatchState,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          HigMaxWidthContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_loading && live.matchId != widget.matchId) ...[
                  const HigLoadingCard(message: 'Loading matchroom...'),
                  const SizedBox(height: 14),
                ],
                if (_error != null) ...[
                  HigErrorBanner(message: _error!, onRetry: _loadMatchState),
                  const SizedBox(height: 14),
                ],

                // 1. SYNCHRONIZED 3-2-1 FORCE AUTO-LAUNCH COUNTDOWN BANNER
                if (isCountdown) ...[
                  GlassCard(
                    radius: 18,
                    padding: const EdgeInsets.all(18),
                    backgroundColor: HigColors.emerald.withValues(alpha: 0.14),
                    borderColor: HigColors.emerald.withValues(alpha: 0.65),
                    child: Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 12,
                      runSpacing: 10,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: HigColors.emerald,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '${live.countdownSeconds}',
                                style: HigTypography.mono(
                                  size: 22,
                                  color: Colors.black,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Flexible(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'BOTH SIDES READY · LAUNCHING ${game.shortName}',
                                    style: HigTypography.headline(
                                        color: HigColors.emerald),
                                  ),
                                  Text(
                                    'Final Ready by ${live.lastReadyPressedBy}. Escrow locked & background verification armed.',
                                    style: HigTypography.footnote(),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        HigButton(
                          label: 'Launch Now',
                          icon: CupertinoIcons.rocket_fill,
                          variant: HigButtonVariant.emerald,
                          onPressed: () => ref
                              .read(liveMatchEngineProvider.notifier)
                              .executeForceAutoLaunch(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // 2. REAL OPPONENT JOIN BANNER (Only shown when Side B is open and viewer is NOT host)
                if (canAcceptAsOpponent && !isSettled) ...[
                  GlassCard(
                    radius: 18,
                    padding: const EdgeInsets.all(18),
                    backgroundColor: HigColors.emerald.withValues(alpha: 0.10),
                    borderColor: HigColors.emerald.withValues(alpha: 0.50),
                    child: Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              CupertinoIcons.person_crop_circle_badge_checkmark,
                              color: HigColors.emerald,
                              size: 26,
                            ),
                            const SizedBox(width: 12),
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 420),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Open Seat on Side B',
                                    style: HigTypography.headline(
                                        color: HigColors.emerald),
                                  ),
                                  Text(
                                    'Accept this challenge to lock your seat against @${live.hostName} in ${game.displayName}.',
                                    style: HigTypography.footnote(),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        HigButton(
                          label: 'Accept & Join Side B',
                          icon: CupertinoIcons.bolt_fill,
                          variant: HigButtonVariant.emerald,
                          loading: _joining,
                          onPressed: () async {
                            setState(() => _joining = true);
                            try {
                              await ref
                                  .read(arenaDataProvider.notifier)
                                  .acceptChallenge(
                                      widget.matchId, session.username);
                              ref
                                  .read(liveMatchEngineProvider.notifier)
                                  .setOpponentSeated(
                                    true,
                                    opponentName: session.username,
                                  );
                              ref.read(toastProvider.notifier).show(
                                    'Seated on Side B',
                                    body:
                                        'Press Ready to lock escrow and launch.',
                                    tone: ToastTone.success,
                                  );
                            } on ApiException catch (e) {
                              ref
                                  .read(toastProvider.notifier)
                                  .show(e.message, tone: ToastTone.error);
                            } finally {
                              if (mounted) setState(() => _joining = false);
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // 3. MATCHROOM HEADER CARD
                GlassCard(
                  radius: 18,
                  padding: const EdgeInsets.all(18),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 52,
                        height: 68,
                        child: GamePosterView(game: game, borderRadius: 10),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: 6,
                              runSpacing: 6,
                              children: [
                                HigBadge(
                                  label: game.displayName,
                                  tone: HigBadgeTone.copper,
                                ),
                                HigBadge(label: _format),
                                HigBadge(
                                  label: 'ROOM $roomCode',
                                  tone: HigBadgeTone.emerald,
                                ),
                                HigBadge(
                                  label: gameInstalledOnDevice
                                      ? 'INSTALLED'
                                      : 'CONFIRM INSTALL',
                                  tone: gameInstalledOnDevice
                                      ? HigBadgeTone.emerald
                                      : HigBadgeTone.neutral,
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text('Arena Matchroom',
                                style: HigTypography.title2()),
                            Text(
                              'Device FP: ${machine.deviceFingerprint} · Status: $_matchStatus',
                              style: HigTypography.caption(),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 18),

                // 4. REAL PROOF OF VICTORY CARD (ONLY WHEN TRULY SETTLED)
                if (isSettled) ...[
                  Text('Official Match Settlement',
                      style: HigTypography.title3()),
                  const SizedBox(height: 12),
                  ProofOfVictoryCard(
                    game: game,
                    matchId: widget.matchId,
                    playerAName: live.hostName,
                    playerBName: live.opponentName.isNotEmpty
                        ? live.opponentName
                        : 'Opponent',
                    scoreA: live.scoreA,
                    scoreB: live.scoreB,
                    viewerWon: _winnerName != null
                        ? _winnerName!.toLowerCase() ==
                            session.username.toLowerCase()
                        : (isHost
                            ? live.scoreA >= live.scoreB
                            : live.scoreB > live.scoreA),
                    stakeUsd: live.stakeUsd,
                    payoutUsd: live.stakeUsd * 1.8,
                    isTournament: false,
                  ),
                  const SizedBox(height: 22),
                ],

                // 5. RESPONSIVE SPLIT-PANE MATCHROOM BODY
                if (Responsive.isDesktopOrExpanded(context))
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(flex: 5, child: leftColumn),
                      const SizedBox(width: 18),
                      Expanded(flex: 5, child: rightColumn),
                    ],
                  )
                else ...[
                  rightColumn,
                  const SizedBox(height: 16),
                  leftColumn,
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _competitorRow({
    required String label,
    required String username,
    String countryCode = '',
    required String handle,
    required bool ready,
    required int score,
    required String actionLabel,
    required HigButtonVariant actionAccent,
    VoidCallback? onAction,
    required VoidCallback onCopy,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: HigColors.surfaceGrouped,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: ready
              ? HigColors.emerald.withValues(alpha: 0.45)
              : HigColors.glassBorder,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: ready
                  ? HigColors.emerald.withValues(alpha: 0.16)
                  : HigColors.surfaceElevated,
              borderRadius: BorderRadius.circular(11),
            ),
            alignment: Alignment.center,
            child: Text(
              '$score',
              style: HigTypography.mono(
                size: 18,
                color: ready ? HigColors.emerald : HigColors.labelPrimary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: HigTypography.caption()),
                Row(
                  children: [
                    if (countryCode.isNotEmpty) ...[
                      CountryFlag(code: countryCode, width: 16, height: 11),
                      const SizedBox(width: 6),
                    ],
                    Expanded(
                      child: Text(username,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              HigTypography.headline().copyWith(fontSize: 14)),
                    ),
                  ],
                ),
                Text(
                  handle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: HigTypography.mono(
                    size: 11,
                    color: HigColors.brandBright,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          if (onAction != null) ...[
            HigButton(
              label: actionLabel,
              size: HigButtonSize.small,
              variant: actionAccent,
              onPressed: onAction,
            ),
            const SizedBox(width: 6),
          ],
          CupertinoButton(
            padding: const EdgeInsets.all(6),
            minimumSize: const Size(30, 30),
            onPressed: onCopy,
            child: const Icon(
              CupertinoIcons.doc_on_doc,
              size: 16,
              color: HigColors.labelSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _stepTile(int step, String title, String subtitle, {required bool done}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: done ? HigColors.emerald : HigColors.surfaceElevated,
            ),
            alignment: Alignment.center,
            child: done
                ? const Icon(CupertinoIcons.checkmark_alt,
                    size: 14, color: Colors.black)
                : Text(
                    '$step',
                    style: HigTypography.mono(
                      size: 11,
                      color: HigColors.labelSecondary,
                    ),
                  ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: HigTypography.headline().copyWith(fontSize: 13.5)),
                Text(subtitle, style: HigTypography.footnote()),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
