import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/app_state.dart';
import '../../design_system/layout/responsive.dart';
import '../../design_system/tokens/hig_tokens.dart';
import '../../design_system/widgets/active_game_switcher.dart';
import '../../design_system/widgets/hig_primitives.dart';
import '../../design_system/widgets/proof_of_victory_card.dart';

/// Live Elo Rating Breakdown (`GET /ratings/me`)
class RatingsScreen extends ConsumerStatefulWidget {
  const RatingsScreen({super.key});

  @override
  ConsumerState<RatingsScreen> createState() => _RatingsScreenState();
}

class _RatingsScreenState extends ConsumerState<RatingsScreen> {
  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _myRatings = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final session = ref.read(playerSessionProvider);
    if (session.accessToken == null || session.accessToken!.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiClient.get('/ratings/me');
      if (res is List) {
        _myRatings = res.whereType<Map<String, dynamic>>().toList();
      } else if (res is Map && res['ratings'] is List) {
        _myRatings = (res['ratings'] as List)
            .whereType<Map<String, dynamic>>()
            .toList();
      }
    } on ApiException catch (e) {
      _error = e.message;
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(playerSessionProvider);
    const tiers = [
      ('Grandmaster', '2000+ ELO', 'Top 1% ranked competitors', HigColors.crimson),
      ('Diamond', '1700 – 1999 ELO', 'Tournament contenders', HigColors.brand),
      ('Platinum', '1450 – 1699 ELO', 'High-stakes competitors', HigColors.blue),
      ('Gold', '1200 – 1449 ELO', 'Verified ranked regulars', HigColors.amber),
      ('Silver', '1000 – 1199 ELO', 'Starting competitive rank', HigColors.labelSecondary),
      ('Bronze', '< 1000 ELO', 'Developing competitors', HigColors.labelTertiary),
    ];

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          HigMaxWidthContainer(
            maxWidth: 920,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                GlassCard(
                  radius: 16,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Ratings & Divisions', style: HigTypography.title2()),
                      const SizedBox(height: 6),
                      Text(
                        '@${session.username} · ${session.elo} ELO · ${session.wins}W - ${session.losses}L',
                        style: HigTypography.mono(
                          size: 13.5,
                          color: HigColors.emerald,
                        ),
                      ),
                    ],
                  ),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  HigErrorBanner(message: _error!, onRetry: _load),
                ],

                if (_loading) ...[
                  const SizedBox(height: 12),
                  const HigLoadingCard(message: 'Loading your ratings...'),
                ] else if (_myRatings.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  GlassCard(
                    radius: 16,
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Your Category Ratings',
                            style: HigTypography.title3()),
                        const SizedBox(height: 10),
                        ..._myRatings.map((r) {
                          final type =
                              (r['game_type'] ?? r['gameType'] ?? 'HEAD_TO_HEAD')
                                  .toString();
                          final elo = (r['rating'] ?? r['elo'] ?? 1200).toString();
                          final rd = (r['rd'] ?? r['deviation'] ?? 0).toString();
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(type.replaceAll('_', ' '),
                                    style: HigTypography.headline()),
                                Text('$elo ELO (RD $rd)',
                                    style: HigTypography.mono(
                                        size: 13, color: HigColors.emerald)),
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 14),

                ...tiers.map(
                  (t) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: GlassCard(
                      radius: 14,
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: t.$4,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(t.$1, style: HigTypography.headline()),
                                Text(t.$3, style: HigTypography.caption()),
                              ],
                            ),
                          ),
                          Text(t.$2,
                              style: HigTypography.mono(size: 12.5, color: t.$4)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Proof of Victory Card Preview (`/settlement-preview`)
class SettlementPreviewScreen extends ConsumerStatefulWidget {
  const SettlementPreviewScreen({super.key});

  @override
  ConsumerState<SettlementPreviewScreen> createState() =>
      _SettlementPreviewScreenState();
}

class _SettlementPreviewScreenState
    extends ConsumerState<SettlementPreviewScreen> {
  bool _viewerWon = true;
  int _mode = 0;

  @override
  Widget build(BuildContext context) {
    final activeGame = ref.watch(activeGameProvider);
    final session = ref.watch(playerSessionProvider);

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        HigMaxWidthContainer(
          maxWidth: 720,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GlassCard(
                radius: 16,
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Settlement Card Preview',
                            style: HigTypography.title2()),
                        HigButton(
                          label: 'Switch Game',
                          size: HigButtonSize.small,
                          variant: HigButtonVariant.secondary,
                          onPressed: () => showGameSelectionSheet(context, ref),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        HigSegmentedControl<bool>(
                          backgroundColor: HigColors.surfaceGrouped,
                          activeColor:
                              _viewerWon ? HigColors.emerald : HigColors.crimson,
                          activeTextColor:
                              _viewerWon ? Colors.black : Colors.white,
                          groupValue: _viewerWon,
                          onChanged: (v) => setState(() => _viewerWon = v),
                          segments: const {
                            true: 'Winner View',
                            false: 'Loser View',
                          },
                        ),
                        const SizedBox(height: 10),
                        HigSegmentedControl<int>(
                          backgroundColor: HigColors.surfaceGrouped,
                          groupValue: _mode,
                          onChanged: (v) => setState(() => _mode = v),
                          segments: const {
                            0: '1v1 Duel',
                            1: 'Semi-Final',
                            2: 'Grand Final',
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              ProofOfVictoryCard(
                game: activeGame,
                matchId: 'preview_card',
                playerAName: session.username,
                playerBName: 'Opponent',
                scoreA: _viewerWon ? 3 : 1,
                scoreB: _viewerWon ? 1 : 3,
                viewerWon: _viewerWon,
                stakeUsd: 25.0,
                payoutUsd: _mode == 2 ? 180.0 : 47.50,
                isTournament: _mode != 0,
                tournamentRound: _mode == 1 ? 'SEMI-FINAL' : 'GRAND FINAL',
                isTournamentFinal: _mode == 2,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
