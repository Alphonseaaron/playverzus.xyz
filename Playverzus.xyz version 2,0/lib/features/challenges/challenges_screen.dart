import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/official_games.dart';
import '../../core/config/app_config.dart';
import '../../core/data/arena_repository.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/country_flag.dart';
import '../../design_system/widgets/hig_primitives.dart';

class ChallengesScreen extends ConsumerStatefulWidget {
  const ChallengesScreen({super.key});

  @override
  ConsumerState<ChallengesScreen> createState() => _ChallengesScreenState();
}

class _ChallengesScreenState extends ConsumerState<ChallengesScreen> {
  bool _onlyActiveGame = true; // Individually scoped per selected game by default
  int _feeFilter = 0; // 0 = All, 1 = Free, 2 = Cash
  String _modeFilter = 'ALL'; // ALL | 1V1_OPEN | DIRECT_RIVAL | PRIVATE_ROOM | PARTY_SQUAD
  final _roomCodeCtrl = TextEditingController();

  @override
  void dispose() {
    _roomCodeCtrl.dispose();
    super.dispose();
  }

  String _formatMoney(PaymentGatewayMode gateway, ChallengeModel c) {
    if (!c.isCash || c.stakeUsd == 0) return 'FREE · 500 PTS';
    if (gateway == PaymentGatewayMode.kopokopo) {
      return 'KES ${(c.stakeUsd * AppConfig.usdToKesRate).round()}';
    }
    return '\$${c.stakeUsd.toStringAsFixed(2)} USDC';
  }

  String _modeLabel(String mode, String squad) {
    return switch (mode) {
      'DIRECT_RIVAL' => 'DIRECT RIVAL',
      'PRIVATE_ROOM' => 'PRIVATE ROOM',
      'PARTY_SQUAD' => 'SQUAD · $squad',
      _ => '1V1 OPEN',
    };
  }

  void _joinByCode() {
    final code = _roomCodeCtrl.text.trim().toUpperCase();
    if (code.isEmpty) {
      ref.read(toastProvider.notifier).show(
            'Enter a Room Code',
            body: 'Paste the room code shared by your opponent.',
            tone: ToastTone.warning,
          );
      return;
    }
    context.push('/matches/room/$code');
  }

  @override
  Widget build(BuildContext context) {
    final activeGame = ref.watch(activeGameProvider);
    final gateway = ref.watch(paymentGatewayProvider);
    final arena = ref.watch(arenaDataProvider);
    final session = ref.watch(playerSessionProvider);
    final isCompact = Responsive.isCompact(context);

    final visible = arena.challenges.where((c) {
      if (_onlyActiveGame && c.gameId != activeGame.id) return false;
      if (_feeFilter == 1 && c.isCash && c.stakeUsd > 0) return false;
      if (_feeFilter == 2 && (!c.isCash || c.stakeUsd == 0)) return false;
      if (_modeFilter != 'ALL' && c.mode != _modeFilter) return false;
      return true;
    }).toList();

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. HEADER & CREATE DUEL
              GlassCard(
                radius: 20,
                padding: const EdgeInsets.all(18),
                child: Column(
                  children: [
                    Row(
                      children: [
                        SizedBox(
                          width: 48,
                          height: 64,
                          child:
                              GamePosterView(game: activeGame, borderRadius: 10),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              HigBadge(
                                label: _onlyActiveGame
                                    ? '${activeGame.shortName} LIVE BOARD'
                                    : 'ALL CHALLENGE MODES',
                                tone: HigBadgeTone.copper,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _onlyActiveGame
                                    ? '${activeGame.displayName} Duels'
                                    : 'Duel Matchmaking & Private Rooms',
                                style: HigTypography.title2(),
                              ),
                              Text(
                                '1v1 Open Board · Direct Rival (@tag) · Private Room Codes · Squads (2v2 / 3v3 / 5v5) · Country-Locked.',
                                style: HigTypography.footnote(),
                              ),
                            ],
                          ),
                        ),
                        if (!isCompact) ...[
                          HigButton(
                            label: 'Create Challenge',
                            icon: CupertinoIcons.add,
                            onPressed: () => context.push('/matches/new'),
                          ),
                        ],
                      ],
                    ),
                    if (isCompact) ...[
                      const SizedBox(height: 14),
                      HigButton(
                        label: 'Create Challenge',
                        icon: CupertinoIcons.add,
                        size: HigButtonSize.small,
                        fullWidth: true,
                        onPressed: () => context.push('/matches/new'),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // 2. JOIN PRIVATE DUEL BY ROOM CODE BAR
              GlassCard(
                radius: 16,
                padding: const EdgeInsets.all(14),
                borderColor: HigColors.emerald.withValues(alpha: 0.32),
                child: isCompact
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          HigTextField(
                            controller: _roomCodeCtrl,
                            placeholder: 'Enter private room code',
                            prefixIcon: CupertinoIcons.number,
                          ),
                          const SizedBox(height: 10),
                          HigButton(
                            label: 'Join Private Room',
                            icon: CupertinoIcons.arrow_right_circle_fill,
                            variant: HigButtonVariant.emerald,
                            fullWidth: true,
                            onPressed: _joinByCode,
                          ),
                        ],
                      )
                    : Row(
                        children: [
                          Expanded(
                            child: HigTextField(
                              controller: _roomCodeCtrl,
                              placeholder: 'Enter private room code',
                              prefixIcon: CupertinoIcons.number,
                            ),
                          ),
                          const SizedBox(width: 10),
                          HigButton(
                            label: 'Join Room',
                            icon: CupertinoIcons.arrow_right_circle_fill,
                            variant: HigButtonVariant.emerald,
                            onPressed: _joinByCode,
                          ),
                        ],
                      ),
              ),

              const SizedBox(height: 16),

              // 3. CHALLENGE VERSION / MODE FILTER CHIPS (Wrap — zero edge clipping)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _modeChip('ALL', 'All (${arena.challenges.length})'),
                  _modeChip('1V1_OPEN', '1v1 Open'),
                  _modeChip('DIRECT_RIVAL', 'Direct Rival'),
                  _modeChip('PRIVATE_ROOM', 'Private Code'),
                  _modeChip('PARTY_SQUAD', 'Squad / Party'),
                ],
              ),

              const SizedBox(height: 14),

              // 4. GAME & FEE FILTERS (Lag-free HigSegmentedControl)
              LayoutBuilder(
                builder: (context, constraints) {
                  final gameCtrl = HigSegmentedControl<bool>(
                    groupValue: _onlyActiveGame,
                    onChanged: (v) => setState(() => _onlyActiveGame = v),
                    segments: {
                      true: '${activeGame.shortName} Only',
                      false: 'All Games',
                    },
                  );
                  final feeCtrl = HigSegmentedControl<int>(
                    groupValue: _feeFilter,
                    onChanged: (v) => setState(() => _feeFilter = v),
                    segments: const {
                      0: 'All',
                      1: 'Free',
                      2: 'Cash',
                    },
                  );
                  if (constraints.maxWidth < 560) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        gameCtrl,
                        const SizedBox(height: 10),
                        feeCtrl,
                      ],
                    );
                  }
                  return Row(
                    children: [
                      Expanded(child: gameCtrl),
                      const SizedBox(width: 12),
                      Expanded(child: feeCtrl),
                    ],
                  );
                },
              ),

              const SizedBox(height: 18),

              if (arena.errorMessage != null) ...[
                HigErrorBanner(
                  message: arena.errorMessage!,
                  onRetry: () =>
                      ref.read(arenaDataProvider.notifier).refreshFromApi(),
                ),
                const SizedBox(height: 14),
              ],

              // 5. OPEN CHALLENGES GRID
              if (arena.loading && visible.isEmpty)
                const HigLoadingCard(message: 'Loading open duels...')
              else if (visible.isEmpty)
                GlassCard(
                  radius: 20,
                  padding: const EdgeInsets.all(28),
                  child: Column(
                    children: [
                      const Icon(
                        CupertinoIcons.bolt_slash,
                        size: 36,
                        color: HigColors.labelTertiary,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'No Matching Open Challenges',
                        style: HigTypography.title3(),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Launch a new 1v1, Direct Rival, Private Room, or Squad duel now.',
                        textAlign: TextAlign.center,
                        style: HigTypography.footnote(),
                      ),
                      const SizedBox(height: 16),
                      HigButton(
                        label: 'Create ${activeGame.shortName} Challenge',
                        icon: CupertinoIcons.add,
                        onPressed: () => context.push('/matches/new'),
                      ),
                    ],
                  ),
                )
              else
                LayoutBuilder(
                  builder: (context, constraints) {
                    final cols = constraints.maxWidth >= 980
                        ? 3
                        : constraints.maxWidth >= 600
                            ? 2
                            : 1;
                    final cardWidth =
                        (constraints.maxWidth - (cols - 1) * 14) / cols;
                    return Wrap(
                      spacing: 14,
                      runSpacing: 14,
                      children: visible.map((c) {
                        final g = findOfficialGameById(c.gameId);
                        final isInvitedToMe = c.invitedOpponent != null &&
                            c.invitedOpponent!.toLowerCase() ==
                                session.username.toLowerCase();

                        return SizedBox(
                          width: cardWidth,
                          child: GlassCard(
                            radius: 18,
                            padding: const EdgeInsets.all(16),
                            borderColor: isInvitedToMe
                                ? HigColors.copper.withValues(alpha: 0.6)
                                : null,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Row(
                                  children: [
                                    SizedBox(
                                      width: 38,
                                      height: 50,
                                      child: GamePosterView(
                                          game: g, borderRadius: 8),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '@${c.hostName}',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: HigTypography.headline(),
                                          ),
                                          Text(
                                            '${g.displayName} · ${c.hostElo} ELO',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: HigTypography.footnote(),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    HigBadge(
                                      label: _formatMoney(gateway, c),
                                      tone: c.isCash && c.stakeUsd > 0
                                          ? HigBadgeTone.emerald
                                          : HigBadgeTone.indigo,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    HigBadge(
                                      label: _modeLabel(c.mode, c.squadSize),
                                      tone: HigBadgeTone.copper,
                                    ),
                                    HigBadge(label: c.format),
                                    if (c.countryLock != null &&
                                        c.countryLock!.isNotEmpty)
                                      CountryFlag(
                                        code: c.countryLock,
                                        width: 18,
                                        height: 12,
                                        showCode: true,
                                      )
                                    else
                                      HigBadge(label: c.region),
                                    HigBadge(label: c.roomCode),
                                  ],
                                ),
                                const SizedBox(height: 14),
                                HigButton(
                                  label: isInvitedToMe
                                      ? 'Accept Rival Invite'
                                      : 'Accept Duel & Enter Arena',
                                  icon: CupertinoIcons.bolt_fill,
                                  size: HigButtonSize.small,
                                  fullWidth: true,
                                  onPressed: () async {
                                    ref
                                        .read(activeGameProvider.notifier)
                                        .selectGame(g);
                                    try {
                                      await ref
                                          .read(arenaDataProvider.notifier)
                                          .acceptChallenge(
                                              c.id, session.username);
                                      if (!context.mounted) return;
                                      ref.read(toastProvider.notifier).show(
                                            'Duel Accepted',
                                            body:
                                                'Seated on Side B in ${g.displayName} (${c.roomCode}).',
                                            tone: ToastTone.success,
                                          );
                                      context.push('/matches/${c.id}');
                                    } on ApiException catch (e) {
                                      if (!context.mounted) return;
                                      ref.read(toastProvider.notifier).show(
                                            e.message,
                                            tone: ToastTone.error,
                                          );
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    );
                  },
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _modeChip(String key, String label) {
    final sel = _modeFilter == key;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _modeFilter = key);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: sel ? HigColors.brand : HigColors.surfacePrimary,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(
            color: sel ? HigColors.brand : HigColors.glassBorder,
            width: 0.75,
          ),
        ),
        child: Text(
          label,
          style: HigTypography.footnote(
            color: sel ? Colors.white : HigColors.labelSecondary,
          ),
        ),
      ),
    );
  }
}
