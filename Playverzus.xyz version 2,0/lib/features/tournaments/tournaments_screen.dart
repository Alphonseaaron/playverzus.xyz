import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/catalog/official_games.dart';
import '../../core/config/app_config.dart';
import '../../core/data/arena_repository.dart';
import '../../core/network/api_client.dart';
import '../../core/network/friendly_errors.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/hig_primitives.dart';

class TournamentsScreen extends ConsumerStatefulWidget {
  const TournamentsScreen({super.key});

  @override
  ConsumerState<TournamentsScreen> createState() => _TournamentsScreenState();
}

class _TournamentsScreenState extends ConsumerState<TournamentsScreen> {
  bool _onlyActiveGame = true; // Individually scoped per selected game by default
  int _blitzTier = 0; // 0 = All, 1..5
  int _feeFilter = 0; // 0 = All, 1 = Free, 2 = Cash
  String? _joiningId;

  String _fmt(PaymentGatewayMode gw, double usd) {
    if (usd == 0) return 'FREE';
    return AppConfig.formatUsdc(usd);
  }

  Color _tierColor(int tier) {
    return switch (tier) {
      1 => HigColors.emerald,
      2 => HigColors.blue,
      3 => HigColors.indigo,
      4 => HigColors.amber,
      _ => HigColors.crimson,
    };
  }

  String _tierLabel(int tier, PaymentGatewayMode gw, double feeUsd) {
    final name = switch (tier) {
      1 => 'TIER 1 · STARTER',
      2 => 'TIER 2 · CHALLENGER',
      3 => 'TIER 3 · CHAMPION',
      4 => 'TIER 4 · MASTER',
      _ => 'TIER 5 · GRANDMASTER',
    };
    return '$name (${_fmt(gw, feeUsd)})';
  }

  Future<void> _joinPool(TournamentModel pool) async {
    final session = ref.read(playerSessionProvider);
    setState(() => _joiningId = pool.id);
    try {
      final updated = await ref
          .read(arenaDataProvider.notifier)
          .joinTournament(pool.id, session.username, session.countryCode);
      if (!mounted) return;

      if (updated != null) {
        final filled = updated.isFull;
        ref.read(toastProvider.notifier).show(
              filled ? 'Blitz Pool Full · Bracket Live!' : 'Joined Blitz Pool!',
              body: filled
                  ? '${updated.name} filled 5/5! Matchrooms are live and a new pool auto-opened.'
                  : '${updated.enrolledCount}/5 Players seated (${updated.slotsLeft} left).',
              tone: ToastTone.success,
            );
        context.push('/tournaments/${updated.id}');
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(e.message, tone: ToastTone.error);
    } catch (e) {
      if (!mounted) return;
      ref.read(toastProvider.notifier).show(
            FriendlyError.humanize(e),
            tone: ToastTone.error,
          );
    } finally {
      if (mounted) setState(() => _joiningId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeGame = ref.watch(activeGameProvider);
    final gateway = ref.watch(paymentGatewayProvider);
    final arena = ref.watch(arenaDataProvider);
    final session = ref.watch(playerSessionProvider);
    final isCompact = Responsive.isCompact(context);

    final visibleBlitz = arena.blitzPools.where((p) {
      if (_blitzTier != 0 && p.tier != _blitzTier) return false;
      if (_onlyActiveGame && p.gameId != activeGame.id) return false;
      return true;
    }).toList();

    final visibleCups = arena.tournaments.where((t) {
      if (_onlyActiveGame && t.gameId != activeGame.id) return false;
      if (_feeFilter == 1 && t.entryFeeUsd > 0) return false;
      if (_feeFilter == 2 && t.entryFeeUsd == 0) return false;
      return true;
    }).toList();

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. TOURNAMENTS & CHAMPIONSHIPS HERO
              if (arena.errorMessage != null) ...[
                HigErrorBanner(
                  message: arena.errorMessage!,
                  onRetry: () =>
                      ref.read(arenaDataProvider.notifier).refreshFromApi(),
                ),
                const SizedBox(height: 14),
              ],
              if (arena.loading &&
                  arena.blitzPools.isEmpty &&
                  arena.tournaments.isEmpty) ...[
                const HigLoadingCard(message: 'Loading brackets and Blitz pools...'),
                const SizedBox(height: 14),
              ],
              GlassCard(
                radius: 20,
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Row(
                      children: [
                        SizedBox(
                          width: 48,
                          height: 64,
                          child: GamePosterView(game: activeGame, borderRadius: 10),
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
                                  const HigBadge(
                                    label: 'OFFICIAL & COMMUNITY CUPS',
                                    tone: HigBadgeTone.copper,
                                  ),
                                  if (arena.syncedWithApi)
                                    const HigBadge(
                                      label: 'LIVE API SYNCED',
                                      tone: HigBadgeTone.emerald,
                                    ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text('Tournaments & Blitz Sit & Go',
                                  style: HigTypography.title2()),
                              Text(
                                '5-Player Auto-Firing Blitz Pools, Single & Double Elimination, Swiss & Round Robin.',
                                style: HigTypography.footnote(),
                              ),
                            ],
                          ),
                        ),
                        if (!isCompact) ...[
                          HigButton(
                            label: 'Create Tournament',
                            icon: CupertinoIcons.add,
                            onPressed: () => context.push('/tournaments/new'),
                          ),
                        ],
                      ],
                    ),
                    if (isCompact) ...[
                      const SizedBox(height: 14),
                      HigButton(
                        label: 'Create Tournament',
                        icon: CupertinoIcons.add,
                        size: HigButtonSize.small,
                        fullWidth: true,
                        onPressed: () => context.push('/tournaments/new'),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Active Game vs All Games Filter (Lag-free HigSegmentedControl)
              LayoutBuilder(
                builder: (context, constraints) {
                  final seg = HigSegmentedControl<bool>(
                    groupValue: _onlyActiveGame,
                    onChanged: (v) => setState(() => _onlyActiveGame = v),
                    segments: {
                      true: '${activeGame.shortName} Only',
                      false:
                          'All Arenas (${arena.blitzPools.length + arena.tournaments.length})',
                    },
                  );
                  final refreshBtn = HigButton(
                    label: 'Refresh Queues',
                    icon: CupertinoIcons.refresh,
                    size: HigButtonSize.small,
                    variant: HigButtonVariant.secondary,
                    loading: arena.loading,
                    fullWidth: constraints.maxWidth < 520,
                    onPressed: () =>
                        ref.read(arenaDataProvider.notifier).refreshFromApi(),
                  );
                  if (constraints.maxWidth < 520) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        seg,
                        const SizedBox(height: 10),
                        refreshBtn,
                      ],
                    );
                  }
                  return Row(
                    children: [
                      Expanded(child: seg),
                      const SizedBox(width: 12),
                      refreshBtn,
                    ],
                  );
                },
              ),

              const SizedBox(height: 22),

              // ===============================================================
              // 2. 5-PLAYER BLITZ SIT & GO SECTION (TIERS 1-5 + AUTO-CLONE)
              // ===============================================================
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  CupertinoIcons.bolt_fill,
                                  color: HigColors.emerald,
                                  size: 18,
                                ),
                                const SizedBox(width: 6),
                                Text('5-Player Blitz Sit & Go',
                                    style: HigTypography.title3()),
                              ],
                            ),
                            const HigBadge(
                              label: 'LIVE QUEUES',
                              tone: HigBadgeTone.emerald,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Fast 5-player knockout pools. Net prize pool splits 1st (70%) & 2nd (30%). Auto-clones a new pool the second 5/5 fills!',
                          style: HigTypography.footnote(),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Tier 1-5 Filter Strip (Wrap — zero right-edge clipping)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _tierChip(0, 'All Tiers', HigColors.brand),
                  _tierChip(1, 'T1 · ${_fmt(gateway, 10)}', HigColors.emerald),
                  _tierChip(2, 'T2 · ${_fmt(gateway, 50)}', HigColors.blue),
                  _tierChip(3, 'T3 · ${_fmt(gateway, 100)}', HigColors.indigo),
                  _tierChip(4, 'T4 · ${_fmt(gateway, 200)}', HigColors.amber),
                  _tierChip(5, 'T5 · ${_fmt(gateway, 500)}', HigColors.crimson),
                ],
              ),

              const SizedBox(height: 14),

              if (visibleBlitz.isEmpty)
                GlassCard(
                  radius: 18,
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    children: [
                      Text(
                        'No Blitz Pools match this filter',
                        style: HigTypography.headline(),
                      ),
                      const SizedBox(height: 8),
                      HigButton(
                        label: 'Show All Blitz Tiers & Games',
                        size: HigButtonSize.small,
                        variant: HigButtonVariant.secondary,
                        onPressed: () => setState(() {
                          _blitzTier = 0;
                          _onlyActiveGame = false;
                        }),
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
                      children: visibleBlitz.map((pool) {
                        final g = findOfficialGameById(pool.gameId);
                        final accent = _tierColor(pool.tier);
                        final rake = PlatformRakeSchedule.blitzRakeRate(pool.tier);
                        final netPool = pool.entryFeeUsd * 5 * (1.0 - rake);
                        final firstPrize = netPool * 0.70;
                        final secondPrize = netPool * 0.30;
                        final alreadyIn = pool.entrants
                            .any((e) => e.username == session.username);

                        return SizedBox(
                          width: cardWidth,
                          child: GlassCard(
                            radius: 18,
                            padding: const EdgeInsets.all(16),
                            borderColor: accent.withValues(alpha: 0.45),
                            backgroundColor: accent.withValues(alpha: 0.05),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Flexible(
                                      child: HigBadge(
                                        label: _tierLabel(
                                          pool.tier,
                                          gateway,
                                          pool.entryFeeUsd,
                                        ),
                                        tone: pool.tier == 1
                                            ? HigBadgeTone.emerald
                                            : pool.tier == 3
                                                ? HigBadgeTone.indigo
                                                : pool.tier == 5
                                                    ? HigBadgeTone.crimson
                                                    : HigBadgeTone.copper,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '${pool.enrolledCount}/5',
                                      style: HigTypography.mono(
                                        size: 13,
                                        color: HigColors.labelPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    SizedBox(
                                      width: 38,
                                      height: 50,
                                      child: GamePosterView(
                                          game: g, borderRadius: 8),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            g.displayName,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: HigTypography.headline(),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '1st: ${_fmt(gateway, firstPrize)} · 2nd: ${_fmt(gateway, secondPrize)}',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: HigTypography.mono(
                                              size: 10.5,
                                              color: HigColors.emerald,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('Queue Fill',
                                            style: HigTypography.caption()),
                                        Text(
                                          pool.isFull
                                              ? 'BRACKET LIVE'
                                              : '${pool.slotsLeft} Slots Left',
                                          style: HigTypography.mono(
                                            size: 10.5,
                                            color: pool.isFull
                                                ? HigColors.copperBright
                                                : HigColors.emerald,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(999),
                                      child: LinearProgressIndicator(
                                        value: pool.enrolledCount / 5.0,
                                        minHeight: 6,
                                        backgroundColor:
                                            HigColors.surfaceElevated,
                                        valueColor:
                                            AlwaysStoppedAnimation(accent),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 14),
                                Row(
                                  children: [
                                    Expanded(
                                      child: HigButton(
                                        label: alreadyIn
                                            ? 'View Bracket'
                                            : pool.isFull
                                                ? 'Watch Bracket'
                                                : 'Join (${_fmt(gateway, pool.entryFeeUsd)})',
                                        icon: alreadyIn
                                            ? CupertinoIcons.checkmark_alt
                                            : CupertinoIcons.bolt_fill,
                                        size: HigButtonSize.small,
                                        variant: alreadyIn || pool.isFull
                                            ? HigButtonVariant.secondary
                                            : HigButtonVariant.primary,
                                        fullWidth: true,
                                        loading: _joiningId == pool.id,
                                        onPressed: () {
                                          if (alreadyIn || pool.isFull) {
                                            context.push(
                                                '/tournaments/${pool.id}');
                                          } else {
                                            _joinPool(pool);
                                          }
                                        },
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    HigButton(
                                      label: 'Invite',
                                      icon: CupertinoIcons.share,
                                      size: HigButtonSize.small,
                                      variant: HigButtonVariant.secondary,
                                      onPressed: () {
                                        Clipboard.setData(
                                          ClipboardData(
                                            text:
                                                'https://playverzus.xyz/#/tournaments/${pool.id}',
                                          ),
                                        );
                                        ref.read(toastProvider.notifier).show(
                                              'Blitz Invite Link Copied',
                                              body:
                                                  'Share with opponents to fill the ${pool.slotsLeft} remaining slots!',
                                              tone: ToastTone.info,
                                            );
                                      },
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    );
                  },
                ),

              const SizedBox(height: 28),
              const Divider(height: 1),
              const SizedBox(height: 22),

              // ===============================================================
              // 3. OFFICIAL & COMMUNITY CHAMPIONSHIP CUPS
              // ===============================================================
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 12,
                runSpacing: 12,
                children: [
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 520),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Official & Community Cups',
                            style: HigTypography.title3()),
                        const SizedBox(height: 2),
                        Text(
                          'Single Elimination, Double Elimination, Round Robin & Swiss Brackets.',
                          style: HigTypography.footnote(),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(
                    width: isCompact ? double.infinity : 260,
                    child: HigSegmentedControl<int>(
                      groupValue: _feeFilter,
                      onChanged: (v) => setState(() => _feeFilter = v),
                      segments: const {
                        0: 'All',
                        1: 'Free',
                        2: 'Cash',
                      },
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              if (visibleCups.isEmpty)
                HigEmptyState(
                  icon: CupertinoIcons.rosette,
                  title: 'No Open Cups Right Now',
                  subtitle: _onlyActiveGame
                      ? 'No community brackets are open for ${activeGame.displayName} right now — create one or switch to All Arenas.'
                      : 'No scheduled cups match this filter yet. Launch a custom Single/Double Elim, Swiss, or Round Robin bracket.',
                  actionLabel: 'Create Tournament',
                  onAction: () => context.push('/tournaments/new'),
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
                    children: visibleCups.map((cup) {
                      final g = findOfficialGameById(cup.gameId);
                      return SizedBox(
                        width: cardWidth,
                        child: GlassCard(
                          radius: 18,
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                alignment: WrapAlignment.spaceBetween,
                                children: [
                                  HigBadge(
                                    label: cup.format.replaceAll('_', ' '),
                                    tone: HigBadgeTone.indigo,
                                  ),
                                  HigBadge(
                                    label:
                                        'PRIZE ${_fmt(gateway, cup.prizePoolUsd)}',
                                    tone: HigBadgeTone.emerald,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  SizedBox(
                                    width: 40,
                                    height: 52,
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
                                          cup.name,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: HigTypography.headline(),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${g.displayName} · ${cup.enrolledCount}/${cup.size} Players · Entry ${_fmt(gateway, cup.entryFeeUsd)}',
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: HigTypography.footnote(),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),
                              Row(
                                children: [
                                  Expanded(
                                    child: HigButton(
                                      label: 'Open Bracket',
                                      icon: CupertinoIcons.rosette,
                                      size: HigButtonSize.small,
                                      fullWidth: true,
                                      onPressed: () =>
                                          context.push('/tournaments/${cup.id}'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  HigButton(
                                    label: 'Share',
                                    icon: CupertinoIcons.share,
                                    size: HigButtonSize.small,
                                    variant: HigButtonVariant.secondary,
                                    onPressed: () {
                                      Clipboard.setData(
                                        ClipboardData(
                                          text:
                                              'https://playverzus.xyz/tournaments/${cup.id}',
                                        ),
                                      );
                                      ref.read(toastProvider.notifier).show(
                                            'Tournament Link Copied',
                                            body:
                                                'Send link so opponents can register directly.',
                                            tone: ToastTone.info,
                                          );
                                    },
                                  ),
                                ],
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

  Widget _tierChip(int tier, String label, Color accent) {
    final sel = _blitzTier == tier;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _blitzTier = tier);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
        decoration: BoxDecoration(
          color: sel ? accent : HigColors.surfacePrimary,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(
            color: sel ? accent : HigColors.glassBorder,
            width: 0.75,
          ),
        ),
        child: Text(
          label,
          style: HigTypography.mono(
            size: 11,
            color: sel ? Colors.white : HigColors.labelSecondary,
          ),
        ),
      ),
    );
  }
}
